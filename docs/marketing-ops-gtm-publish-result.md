# CRBOX Marketing Ops GTM Publish Result

Generated: 2026-06-15T17:00:54.801Z

Phase: **2Q**

Mode: **controlled_publish**

Status: **executed**

## Summary

- Business owner approval: true
- Mutation performed: true
- GTM write calls made: true
- GTM version created: true
- GTM published: true
- Execution count: 1
- Final verification: pass

Phase 2Q created and published a GTM container version.

## Business Owner Approval Statement

The business owner approved creating and publishing the reviewed CRBOX GTM container version, limited to the approved Marketing Ops GA4 conversion-event setup.

## Execution Command

`MARKETING_AGENT_MODE=controlled_publish MARKETING_AGENT_ENABLE_WRITES=true MARKETING_AGENT_GTM_CREATE_ENABLED=true npm run marketing:apply:gtm:publish -- --platform gtm --confirm-human-approval`

## Pre-publish Validation

- phase2PConfirmed: true
- phase2NConfirmed: true
- phase2OConfirmed: true
- phase2QBConfirmed: true
- phase2QDConfirmed: true
- previewQaPassed: true
- allSixScopesAvailable: true
- tagmanagerEditContainerVersionsAvailable: true
- tagmanagerPublishAvailable: true
- expectedTagsPresent: true
- expectedTriggersPresent: true
- expectedVariablesPresent: true
- pendingChangesApproved: 14
- unexpectedChanges: 0
- duplicateRisk: 0
- forbiddenParametersFound: 0
- piiFound: 0
- rawClickIdsFound: 0
- validationStatus: pass

## Published Version Metadata

- Version name: CRBOX GA4 conversion event tags - Phase 2Q
- Version ID: `4`
- Container version path: `accounts/6351590751/containers/250367469/versions/4`
- Publish status: published
- Published at: 2026-06-15T17:00:58.431Z
- Previous live version ID: `3`

## What Was Published

- Approved pending changes: 14
- Unexpected changes: 0
- GA4 - quote_request_start
- GA4 - quote_request_submit_success
- GA4 - contact_form_submit_success

## Safety Statement

- noRuntimeFilesTouched: true
- googleAdsTouched: false
- metaTouched: false
- secretsPrinted: false
- tagsCreatedDuringPublish: 0
- triggersCreatedDuringPublish: 0
- variablesCreatedDuringPublish: 0

No Replit/runtime files were changed by this phase.

## Rollback Plan

- Previous version ID: `3`
- Rollback available: true
1. Publish the previous live GTM container version if unexpected tracking behavior is observed.
2. Verify the core GA4 Configuration tag and existing events still fire.
3. Re-run GTM Preview before republishing another version.
4. Keep the Replit runtime unchanged unless a runtime-specific issue is independently confirmed.

## Post-publish Verification

- published: true
- versionCreated: true
- versionPublished: true
- tagsStillPresent: true
- triggersStillPresent: true
- variablesStillPresent: true
- forbiddenParametersFound: 0
- piiFound: 0
- rawClickIdsFound: 0
- finalVerificationStatus: pass

## Remaining Monitoring Steps

- Run the Phase 2R production smoke test.
- Monitor GA4 Realtime and DebugView for the three conversion-intent events.
- Monitor conversion counts and duplicate firing after release.

Post-publish smoke testing is required.

## Next Phase Recommendation

Phase 2R - Post-publish smoke test and monitoring

## Failed Actions

- None.

## Mutation Statement

Phase 2Q created and published exactly one GTM container version from the approved workspace. No tags, triggers, variables, runtime files, Google Ads objects, or Meta objects were created or changed during publish execution.
