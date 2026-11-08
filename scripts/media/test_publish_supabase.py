import hashlib
import json
from email.message import Message
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from publish_supabase import SupabaseDelivery, build_plan, publish

class DeliveryTests(unittest.TestCase):
    def setUp(self):
        self.delivery=SupabaseDelivery('https://example.supabase.co','seven-emirates-game','test-only-not-a-real-key')
        self.body=b'unchanged image bytes'
        self.obj=dict(key='version/frames/test.webp',size=len(self.body),sha256=hashlib.sha256(self.body).hexdigest(),contentType='image/webp')
        self.headers=Message();self.headers['Content-Type']='image/webp';self.headers['Content-Length']=str(len(self.body))
    def test_existing_object_is_verified_without_upload(self):
        with patch.object(self.delivery,'request',return_value=(self.body,self.headers)) as request:
            self.assertEqual(self.delivery.upload_and_verify(self.obj),'verified-existing')
            self.assertEqual(request.call_count,1)
    def test_mismatched_remote_bytes_are_never_overwritten(self):
        with patch.object(self.delivery,'request',return_value=(b'wrong',self.headers)) as request:
            with self.assertRaises(ValueError):self.delivery.upload_and_verify(self.obj)
            self.assertEqual(request.call_count,1)
    def test_wrong_mime_is_rejected(self):
        self.headers.replace_header('Content-Type','text/html')
        with patch.object(self.delivery,'request',return_value=(self.body,self.headers)):
            with self.assertRaises(ValueError):self.delivery.verify(self.obj)
    def test_management_requires_https_without_embedded_credentials(self):
        for url in ['http://example.test','https://user:secret@example.test','https://example.test?key=x']:
            with self.assertRaises(ValueError):SupabaseDelivery(url,'seven-emirates-game','test-only')
    def test_resume_reverifies_objects_and_publishes_manifest_last(self):
        with tempfile.TemporaryDirectory() as directory:
            checkpoint=Path(directory)/'checkpoint.json'
            plan=dict(mediaVersion='v1',manifestSha256='abc',objects=[dict(self.obj,key='a'),dict(self.obj,key='b'),dict(self.obj,key='manifest.json')])
            calls=[]
            with patch.object(self.delivery,'upload_and_verify',side_effect=lambda obj:calls.append(obj['key']) or 'verified-existing'):
                self.assertEqual(publish(plan,self.delivery,checkpoint,2),3)
                self.assertEqual(calls[-1],'manifest.json')
                self.assertEqual(publish(plan,self.delivery,checkpoint,2),3)
                self.assertEqual(len(calls),6)
                self.assertEqual(len(json.loads(checkpoint.read_text())['verified']),3)
                changed=dict(plan,manifestSha256='different')
                with self.assertRaises(ValueError):publish(changed,self.delivery,checkpoint,2)
    def test_existing_student_upload_bucket_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'manifest.json').write_text(json.dumps(dict(mediaVersion='v1')))
            with self.assertRaises(ValueError):build_plan(root,'project-files')
    def test_failed_frame_never_publishes_manifest(self):
        with tempfile.TemporaryDirectory() as directory:
            plan=dict(mediaVersion='v1',manifestSha256='abc',objects=[dict(self.obj,key='a'),dict(self.obj,key='b'),dict(self.obj,key='manifest.json')])
            calls=[]
            def failed(obj):
                calls.append(obj['key'])
                if obj['key']=='a':raise RuntimeError('simulated access failure')
                return 'verified-existing'
            with patch.object(self.delivery,'upload_and_verify',side_effect=failed):
                with self.assertRaises(RuntimeError):publish(plan,self.delivery,Path(directory)/'checkpoint.json',1)
            self.assertNotIn('manifest.json',calls)

if __name__=='__main__':unittest.main()
