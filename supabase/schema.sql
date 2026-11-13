-- 목소리 연습실 · 이번 주 대사 챌린지 순위표
-- Supabase 대시보드 → SQL Editor → New query 에 전부 붙여넣고 Run.
-- 여러 번 실행해도 안전하게 만들었어요.

-- 1) 닉네임 (익명 로그인 사용자 1명당 1개)
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  nickname   text not null check (char_length(btrim(nickname)) between 2 and 12),
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_nickname_key on public.profiles (lower(btrim(nickname)));

-- 2) 챌린지 제출 기록
create table if not exists public.entries (
  id           bigint generated always as identity primary key,
  challenge_id text not null check (challenge_id ~ '^\d{4}-W\d{2}$'),   -- 예: 2026-W47 (한국 시간 기준 ISO 주차)
  user_id      uuid not null references public.profiles(user_id) on delete cascade,
  synchro      numeric(5,2) not null check (synchro >= 0 and synchro < 99),  -- 99 이상은 원본 복사로 보고 거부
  ai           numeric(5,2) check (ai is null or (ai >= 0 and ai < 99)),
  total        numeric(5,2) generated always as (round(synchro * 0.7 + coalesce(ai, synchro) * 0.3, 2)) stored,
  parts        jsonb check (parts is null or pg_column_size(parts) < 1000),
  created_at   timestamptz not null default now()
);
create index if not exists entries_board_idx on public.entries (challenge_id, total desc);
create index if not exists entries_user_idx on public.entries (user_id, created_at desc);

-- 3) 제출 검사: 이번 주 챌린지만, 1분에 1번, 하루 30번까지
create or replace function public.entries_guard() returns trigger
language plpgsql set search_path = public as $$
declare
  this_week text := to_char(now() at time zone 'Asia/Seoul', 'IYYY-"W"IW');
begin
  new.user_id := auth.uid();
  new.created_at := now();
  if new.user_id is null then raise exception '로그인이 필요해요'; end if;
  if new.challenge_id <> this_week then raise exception '이번 주(%) 챌린지에만 제출할 수 있어요', this_week; end if;
  if not exists (select 1 from public.profiles where user_id = new.user_id) then raise exception '닉네임을 먼저 정해 주세요'; end if;
  if exists (select 1 from public.entries where user_id = new.user_id and created_at > now() - interval '1 minute') then
    raise exception '1분에 한 번만 제출할 수 있어요';
  end if;
  if (select count(*) from public.entries where user_id = new.user_id and created_at > now() - interval '1 day') >= 30 then
    raise exception '오늘은 30번까지 제출할 수 있어요';
  end if;
  return new;
end $$;
drop trigger if exists entries_guard on public.entries;
create trigger entries_guard before insert on public.entries for each row execute function public.entries_guard();

-- 4) 행 단위 보안(RLS): 누구나 읽기, 내 것만 쓰기·지우기
alter table public.profiles enable row level security;
alter table public.entries  enable row level security;

drop policy if exists "profiles read"   on public.profiles;
drop policy if exists "profiles insert" on public.profiles;
drop policy if exists "profiles update" on public.profiles;
drop policy if exists "profiles delete" on public.profiles;
create policy "profiles read"   on public.profiles for select using (true);
create policy "profiles insert" on public.profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "profiles update" on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles delete" on public.profiles for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "entries read"   on public.entries;
drop policy if exists "entries insert" on public.entries;
drop policy if exists "entries delete" on public.entries;
create policy "entries read"   on public.entries for select using (true);
create policy "entries insert" on public.entries for insert to authenticated with check (auth.uid() = user_id);
create policy "entries delete" on public.entries for delete to authenticated using (auth.uid() = user_id);

-- 5) 순위표: 챌린지별로 사람마다 최고 점수 1개
create or replace view public.leaderboard with (security_invoker = true) as
select distinct on (e.challenge_id, e.user_id)
  e.challenge_id, e.user_id, p.nickname, e.total, e.synchro, e.ai, e.created_at
from public.entries e join public.profiles p using (user_id)
order by e.challenge_id, e.user_id, e.total desc, e.created_at asc;

-- 6) 권한 ("새 테이블 자동 공개"를 꺼 뒀으므로 필요한 것만 직접 열어요)
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.entries, public.leaderboard to anon, authenticated;
grant insert (user_id, nickname), update (nickname), delete on public.profiles to authenticated;
grant insert (challenge_id, synchro, ai, parts), delete on public.entries to authenticated;
