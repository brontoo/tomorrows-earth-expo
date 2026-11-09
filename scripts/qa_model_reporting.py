"""Current owner decisions supersede historical A/B and educational chapter gates."""
KNOWN_HASHES=dict(prototype='a966b1d4e774e0423c19c8aa71f070e5a72fe7a03c2663dd2f3cb0b0095ee3e1',current='97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482')
def acceptance_stages(report):
    return dict(
      liveMediaAndChapters='passed' if report.get('remoteVerified') else 'not-verified',
      modelInitialization='passed' if report.get('modelInitialized') else 'not-verified',
      modelByteComparison='different-audited-owner-accepted-B',expectedModelHashes=KNOWN_HASHES,
      selectedModel='current',knownArtifactDifference=True,
      modelDecisionSource='Owner Task 10: Model B accepted, Chrome camera checklist 21/21',
      functionalGestureCompatibility='owner-accepted-Model-B',physicalCameraAcceptance='owner-reported-Chrome-21/21',
      educationalWorkflowAcceptance='not-tested-with-genuine-nonproduction-accounts',
      releaseGates=['Genuine staging/platform and free-exploration release-candidate acceptance pending'],productionReady=False,
      automatedTechnicalChecksPassed=bool(report.get('remoteVerified') and report.get('modelInitialized') and not report.get('failures')))
