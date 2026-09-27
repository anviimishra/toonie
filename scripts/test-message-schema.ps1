# Runs real PostgreSQL/pgTAP in a disposable container without network or ports.
# Requires Docker. No hosted Supabase credentials or app data are used.
$ErrorActionPreference = 'Stop'
$testContainer = 'toonie-message-test-' + [guid]::NewGuid().ToString('N').Substring(0, 8)
$repoRoot = Split-Path -Parent $PSScriptRoot
function Invoke-Docker {
  & docker @args
  if ($LASTEXITCODE -ne 0) { throw "Docker command failed: $($args[0])" }
}
try {
  Invoke-Docker run --detach --rm --name $testContainer --network none -e POSTGRES_PASSWORD=local-test-only public.ecr.aws/supabase/postgres:17.6.1.132 | Out-Null
  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    # Init uses a temporary socket-only server; TCP becomes ready after restart.
    & docker exec $testContainer pg_isready -h 127.0.0.1 -U postgres 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (!$ready) { throw 'Test PostgreSQL did not become ready.' }
  # The database image includes Auth, but Storage normally creates its own tables.
  # Model only the storage columns/policies used by these migrations.
  $bootstrapSql = @'
create table storage.buckets (id text primary key, name text not null, public boolean default false);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text not null);
alter table storage.buckets owner to postgres;
alter table storage.objects owner to postgres;
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated;
grant all on storage.buckets, storage.objects to service_role;
'@
  $bootstrapSql | & docker exec -i $testContainer psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) { throw 'Test bootstrap failed.' }
  foreach ($migrationFile in (Get-ChildItem -LiteralPath (Join-Path $repoRoot 'supabase/migrations') -Filter '*.sql' | Sort-Object Name)) {
    Invoke-Docker cp $migrationFile.FullName "${testContainer}:/tmp/migration.sql"
    Invoke-Docker exec $testContainer psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/migration.sql
  }
  Invoke-Docker cp (Join-Path $repoRoot 'supabase/tests/parent_child_messages.test.sql') "${testContainer}:/tmp/message-tests.sql"
  $testOutput = & docker exec $testContainer psql -U postgres -d postgres -v ON_ERROR_STOP=1 -At -f /tmp/message-tests.sql
  $testExit = $LASTEXITCODE
  $testOutput | Write-Output
  if ($testExit -ne 0 -or ($testOutput -match '^not ok') -or !($testOutput -match '^1\.\.[0-9]+$')) {
    throw 'Message schema tests failed.'
  }
} finally {
  # This exact container was created by this script and contains test data only.
  & docker rm --force $testContainer 2>$null | Out-Null
}
