"""Unit tests for reporting/inspection tools. No model/network/camera acceptance claim."""
import hashlib
import importlib.util
import io
from pathlib import Path
import unittest
import zipfile
from qa_model_reporting import acceptance_stages

spec=importlib.util.spec_from_file_location('inspect_models',Path(__file__).with_name('inspect-gesture-models.py'))
inspector=importlib.util.module_from_spec(spec);spec.loader.exec_module(inspector)

class ModelTools(unittest.TestCase):
 def test_owner_accepted_B_retains_artifact_audit_and_separate_staging_gate(self):
  stage=acceptance_stages(dict(remoteVerified=True,modelInitialized=True,failures=[],originalModelComparison=dict(sameBytes=False)))
  self.assertEqual(stage['liveMediaAndChapters'],'passed');self.assertEqual(stage['modelInitialization'],'passed')
  self.assertEqual(stage['modelByteComparison'],'different-audited-owner-accepted-B');self.assertTrue(stage['automatedTechnicalChecksPassed'])
  self.assertFalse(stage['productionReady']);self.assertTrue(stage['releaseGates'])
  self.assertEqual(stage['functionalGestureCompatibility'],'owner-accepted-Model-B')
 def test_network_or_unknown_comparison_is_not_reported_as_a_pass(self):
  stage=acceptance_stages({});self.assertEqual(stage['modelInitialization'],'not-verified')
  self.assertFalse(stage['automatedTechnicalChecksPassed']);self.assertFalse(stage['productionReady'])
 def test_zip_inspection_reads_nested_labels_without_extracting_weights(self):
  inner=io.BytesIO()
  with zipfile.ZipFile(inner,'w') as z:z.writestr('labels.txt','Closed_Fist\nPointing_Up\n')
  outer=io.BytesIO()
  with zipfile.ZipFile(outer,'w') as z:z.writestr('classifier.tflite',inner.getvalue())
  data=outer.getvalue();report=inspector.inspect(data,dict(sha256=hashlib.sha256(data).hexdigest()))
  self.assertEqual(report['components'][1]['labels'],['Closed_Fist','Pointing_Up'])
  with self.assertRaises(ValueError):inspector.inspect(data,dict(sha256='0'*64))

if __name__=='__main__':unittest.main()
