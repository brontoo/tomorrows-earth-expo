import base64
from email.message import Message
import json
from pathlib import Path
import unittest
import tempfile
import urllib.error
import hashlib
from unittest.mock import patch
from assemble_actions_media import validate_manifest,MANIFEST_SHA256,SOURCE_COMMIT
from audit_storage_policy import audit,connection_environment
from publish_supabase import management_headers,SupabaseDelivery
from verify_public_delivery import sample_indices

ROOT=Path(__file__).resolve().parents[2]

class SecretKeyTests(unittest.TestCase):
    def test_concurrent_existing_object_is_not_counted_as_an_upload(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory)/'frame.webp';p.write_bytes(b'unit-test-bytes')
            obj=dict(key='version/frame.webp',path=str(p),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),contentType='image/webp')
            delivery=SupabaseDelivery('https://example.supabase.co','seven-emirates-game','sb_secret_UNIT_TEST_ONLY')
            with patch.object(delivery,'verify',side_effect=[False,True]),patch.object(delivery,'request',side_effect=urllib.error.HTTPError('https://example.supabase.co',409,'exists',None,None)):
                self.assertEqual(delivery.upload_and_verify(obj),'verified-existing')
    def test_new_secret_is_only_an_apikey(self):
        self.assertEqual(management_headers('sb_secret_UNIT_TEST_ONLY'),{'apikey':'sb_secret_UNIT_TEST_ONLY'})
    def test_legacy_service_role_jwt_retains_bearer_compatibility(self):
        payload=base64.urlsafe_b64encode(b'{"role":"service_role"}').decode().rstrip('=')
        token='test.'+payload+'.unit-test-only'
        self.assertEqual(management_headers(token),{'apikey':token,'Authorization':'Bearer '+token})
    def test_anon_publishable_and_user_keys_are_rejected(self):
        for role in ('anon','authenticated'):
            payload=base64.urlsafe_b64encode(json.dumps({'role':role}).encode()).decode().rstrip('=')
            with self.assertRaises(ValueError):management_headers('test.'+payload+'.unit')
        for key in ('sb_publishable_UNIT_TEST','not-a-key'):
            with self.assertRaises(ValueError):management_headers(key)
    def test_storage_request_never_places_new_key_in_bearer_header(self):
        key='sb_secret_UNIT_TEST_ONLY';delivery=SupabaseDelivery('https://example.supabase.co','seven-emirates-game',key)
        class Reply:
            headers=Message()
            def __enter__(self):return self
            def __exit__(self,*args):pass
            def read(self):return b'{}'
        with patch.object(delivery.opener,'open',return_value=Reply()) as opened:
            delivery.request('/storage/v1/bucket/seven-emirates-game',private=True)
            headers={k.lower():v for k,v in opened.call_args.args[0].header_items()}
            self.assertEqual(headers['apikey'],key);self.assertNotIn('authorization',headers)
    def test_bucket_is_checked_for_identity_and_public_read(self):
        delivery=SupabaseDelivery('https://example.supabase.co','seven-emirates-game','sb_secret_UNIT_TEST_ONLY')
        for value in ({'id':'project-files','public':True},{'id':'seven-emirates-game','public':False}):
            with patch.object(delivery,'request',return_value=(json.dumps(value).encode(),Message())):
                with self.assertRaises(ValueError):delivery.ensure_bucket()

def metadata(policies=None):
    return dict(rowSecurity=True,roles=[dict(name=name,superuser=False,bypass=False,ownerMember=False) for name in ('anon','authenticated')],policies=policies or [])

class PolicyTests(unittest.TestCase):
    def test_default_deny_is_accepted_without_policy_modification(self):
        result=audit(metadata());self.assertTrue(result['verified']);self.assertFalse(result['policyChangesPerformed'])
    def test_existing_permissive_client_write_requires_isolation(self):
        for command in ('INSERT','UPDATE','DELETE','ALL'):
            with self.assertRaises(ValueError):audit(metadata([dict(command=command,permissive='PERMISSIVE',roles=['authenticated'])]))
    def test_restrictive_guards_block_game_writes_even_with_permissive_grants(self):
        expr="(bucket_id <> 'seven-emirates-game'::text)"
        policies=[dict(name='existing',command='ALL',permissive='PERMISSIVE',roles=['public'])]
        for command in ('INSERT','UPDATE','DELETE'):
            policies.append(dict(name='game-'+command,command=command,permissive='RESTRICTIVE',roles=['public'],using=expr,check=expr))
        self.assertTrue(audit(metadata(policies))['verified'])
        policies[-1]['using']="(bucket_id <> 'project-files'::text)"
        with self.assertRaises(ValueError):audit(metadata(policies))
    def test_unknown_or_bypassing_client_privileges_are_rejected(self):
        for field in ('bypass','superuser','ownerMember'):
            m=metadata();m['roles'][0][field]=True
            with self.assertRaises(ValueError):audit(m)
        m=metadata();del m['roles'][0]['bypass']
        with self.assertRaises(ValueError):audit(m)
        m=metadata();m['rowSecurity']=False
        with self.assertRaises(ValueError):audit(m)
    def test_connection_is_project_bound_read_only_and_tls_verified(self):
        dsn='postgresql://audit.hjqyhybgitdizfhwpdcv:test-only@aws-0-region.pooler.supabase.com:5432/postgres?sslmode=disable'
        env=connection_environment(dsn)
        self.assertEqual(env['PGSSLMODE'],'verify-full');self.assertIn('default_transaction_read_only=on',env['PGOPTIONS'])
        self.assertNotIn('SUPABASE_SECRET_KEY',env)
        for wrong in ('postgresql://audit:fake@db.other.supabase.co/postgres','https://example.test'):
            with self.assertRaises(ValueError):connection_environment(wrong)

class ImmutableAssemblyTests(unittest.TestCase):
    def test_reviewed_manifest_and_all_boundary_samples(self):
        raw=(ROOT/'media/seven-emirates/manifest.json').read_bytes()
        m,keys=validate_manifest(raw)
        self.assertEqual(len(keys),1673);self.assertEqual(m['provenance']['commit'],SOURCE_COMMIT)
        samples=sample_indices(m);self.assertEqual(len(samples),14)
        for c in m['chapters']:
            self.assertIn(c['startInclusive'],samples);self.assertIn(c['endExclusive']-1,samples)
    def test_manifest_cannot_be_changed_even_by_reserializing_it(self):
        raw=(ROOT/'media/seven-emirates/manifest.json').read_bytes()
        with self.assertRaises(ValueError):validate_manifest(raw+b'\n')

if __name__=='__main__':unittest.main()
