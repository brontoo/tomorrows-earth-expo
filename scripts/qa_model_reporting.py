"""Separate technical passes from model artifact and manual acceptance gates."""
KNOWN_HASHES=dict(prototype='a966b1d4e774e0423c19c8aa71f070e5a72fe7a03c2663dd2f3cb0b0095ee3e1',current='97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482')

def acceptance_stages(report):
    comparison=report.get('originalModelComparison',{})
    gates=['Unreviewed original/current model artifact difference','Physical-camera Chrome and Edge A/B review pending','Genuine nonproduction educational acceptance pending']
    return dict(
      liveMediaAndChapters='passed' if report.get('remoteVerified') else 'not-verified',
      modelInitialization='passed' if report.get('modelInitialized') else 'not-verified',
      modelByteComparison='different' if comparison.get('sameBytes') is False else 'same' if comparison.get('sameBytes') is True else 'unverified-in-this-run',
      expectedModelHashes=KNOWN_HASHES,knownArtifactDifference=True,hashProvenance="Owner-confirmed CI run 42595276281",
      functionalGestureCompatibility='not-tested',physicalCameraAcceptance='not-tested',educationalWorkflowAcceptance='not-tested',
      releaseGates=gates,productionReady=False,
      automatedTechnicalChecksPassed=bool(report.get('remoteVerified') and report.get('modelInitialized') and not report.get('failures')))
