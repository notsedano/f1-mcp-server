-- Create a public storage bucket for NFT metadata JSON
-- Bucket name: nft-metadata

-- Create bucket if not exists
insert into storage.buckets (id, name, public)
select 'nft-metadata', 'nft-metadata', true
where not exists (
  select 1 from storage.buckets where id = 'nft-metadata'
);

-- Allow public read, authenticated write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read NFT metadata'
  ) THEN
    CREATE POLICY "Public read NFT metadata" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'nft-metadata');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated upload NFT metadata'
  ) THEN
    CREATE POLICY "Authenticated upload NFT metadata" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'nft-metadata');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated update NFT metadata'
  ) THEN
    CREATE POLICY "Authenticated update NFT metadata" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'nft-metadata')
      WITH CHECK (bucket_id = 'nft-metadata');
  END IF;
END $$;


