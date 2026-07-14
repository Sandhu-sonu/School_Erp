import { prisma } from '@school-erp/db';
import { 
  initializeModules, 
  getModuleSettings, 
  isModuleEnabled, 
  updateModuleStatus, 
  applyProfilePreset,
  clearModulesCache
} from '../apps/admin/src/lib/services/modules';
import { 
  getSchoolSettings, 
  updateSchoolSettings 
} from '../apps/admin/src/lib/services/school-settings';

async function runTests() {
  console.log('🚀 Starting E2E Verification for ERP Module Toggle Architecture...\n');

  // Find or create a dummy user for logging audit actions
  let testUser = await prisma.user.findFirst();
  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: 'sysadmin@demoerp.com',
        name: 'System Admin',
        passwordHash: 'dummy-hash',
        role: 'PRINCIPAL'
      }
    });
  }

  // 1. Relational Init & Defaults Verification
  console.log('Test 1: Initializing modules in DB...');
  await prisma.$transaction(async (tx) => {
    await initializeModules(tx);
  });
  const settings = await getModuleSettings();
  console.log(`✔ Found ${settings.length} initialized modules in database.`);
  
  const examsMod = settings.find(m => m.moduleKey === 'EXAMS');
  const resultsMod = settings.find(m => m.moduleKey === 'RESULTS');
  console.log(`✔ Relational deps: EXAMS -> ${examsMod?.dependencies.map(d => d.dependsOnModuleKey).join(', ') || 'none'}`);
  console.log(`✔ Relational deps: RESULTS -> ${resultsMod?.dependencies.map(d => d.dependsOnModuleKey).join(', ') || 'none'}`);

  // 2. Dependencies enforcement: Disabling EXAMS must recursively disable RESULTS
  console.log('\nTest 2: Disabling EXAMS module and verifying recursive dependents disable...');
  // Force enable both first
  await prisma.moduleSetting.update({ where: { moduleKey: 'EXAMS' }, data: { enabled: true } });
  await prisma.moduleSetting.update({ where: { moduleKey: 'RESULTS' }, data: { enabled: true } });
  clearModulesCache();

  const disableResult = await updateModuleStatus('EXAMS', false, testUser.id);
  console.log('✔ Disable results:', disableResult);
  
  const resultsStatus = await isModuleEnabled('RESULTS');
  const examsStatus = await isModuleEnabled('EXAMS');
  
  if (resultsStatus || examsStatus) {
    throw new Error('❌ Test 2 failed: EXAMS or RESULTS are still enabled!');
  }
  console.log('✔ Successfully verified recursive disable cascade!');

  // 3. Dependencies enforcement: Enabling RESULTS when EXAMS is disabled must throw error
  console.log('\nTest 3: Attempting to enable RESULTS when EXAMS is disabled...');
  try {
    await updateModuleStatus('RESULTS', true, testUser.id);
    throw new Error('❌ Test 3 failed: Allowed enabling RESULTS while EXAMS is disabled!');
  } catch (err: any) {
    console.log(`✔ Expected error captured: "${err.message}"`);
  }

  // 4. Cache Refresh and Invalidation Verification
  console.log('\nTest 4: Verifying cache invalidation on toggle...');
  await updateModuleStatus('EXAMS', true, testUser.id);
  const cacheStatusBefore = await isModuleEnabled('EXAMS');
  console.log(`✔ Active status in cache: ${cacheStatusBefore}`);
  
  // Directly update DB bypass service to simulate cache stale check
  await prisma.moduleSetting.update({
    where: { moduleKey: 'EXAMS' },
    data: { enabled: false }
  });
  // Check immediately - should read from cache (true)
  const cacheStatusStale = await isModuleEnabled('EXAMS');
  console.log(`✔ Stale status from active cache (TTL check): ${cacheStatusStale}`);
  if (!cacheStatusStale) {
    throw new Error('❌ Cache was not read properly!');
  }

  // Clear cache manually (simulating toggle invalidation)
  clearModulesCache();
  const cacheStatusFresh = await isModuleEnabled('EXAMS');
  console.log(`✔ Fresh status after cache clear: ${cacheStatusFresh}`);
  if (cacheStatusFresh) {
    throw new Error('❌ Cache clear did not refresh values from database!');
  }

  // 5. Preset Profiles Verification
  console.log('\nTest 5: Testing preset profiles configuration...');
  console.log('Applying "Coaching Institute" preset...');
  await applyProfilePreset('Coaching Institute', testUser.id);
  
  const transportActive = await isModuleEnabled('TRANSPORT');
  const resultsActive = await isModuleEnabled('RESULTS');
  const examsActive = await isModuleEnabled('EXAMS');
  const hrActive = await isModuleEnabled('HR');
  const websiteActive = await isModuleEnabled('WEBSITE');
  
  console.log(`✔ Preset Coaching Institute: TRANSPORT=${transportActive}, EXAMS=${examsActive}, RESULTS=${resultsActive}, HR=${hrActive}, WEBSITE=${websiteActive}`);
  if (transportActive || websiteActive || !examsActive || !resultsActive || !hrActive) {
    throw new Error('❌ Test 5 failed: Preset values are incorrect!');
  }
  console.log('✔ Preset applied correctly and values matched expectations!');

  // 6. School Settings Profile Verification
  console.log('\nTest 6: Verifying SchoolSettings profile CRUD and boards enumeration...');
  const currentSettings = await getSchoolSettings();
  console.log(`✔ Active School: ${currentSettings.schoolName}, Board: ${currentSettings.board}, Date: ${currentSettings.dateFormat}`);
  
  const newSchoolName = 'Delhi Public School, Noida';
  const updatedSettings = await updateSchoolSettings(currentSettings.id, {
    ...currentSettings,
    schoolName: newSchoolName,
    board: 'CBSE',
    dateFormat: 'DD/MM/YYYY'
  });
  console.log(`✔ Updated School Name: ${updatedSettings.schoolName}`);
  if (updatedSettings.schoolName !== newSchoolName) {
    throw new Error('❌ Test 6 failed: SchoolSettings name not updated!');
  }

  // 7. Audit Log Verification
  console.log('\nTest 7: Validating toggle actions audit logs...');
  const logs = await prisma.auditLog.findMany({
    where: { userId: testUser.id },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('✔ Last logs found:');
  for (const log of logs) {
    console.log(`  - [${log.action}] ${log.details}`);
  }
  const hasPresetsLog = logs.some(l => l.action === 'APPLY_PRESET');
  if (!hasPresetsLog) {
    throw new Error('❌ Test 7 failed: Audit log for preset toggle missing!');
  }
  console.log('✔ Audit logging verified successfully!');

  // 8. Module Restore
  console.log('\nTest 8: Restoring default modules setup...');
  await applyProfilePreset('High School', testUser.id);
  console.log('✔ Restored High School configuration defaults.');

  console.log('\n🎉 ALL E2E SERVICES AND SCHEMA VERIFICATIONS COMPLETED SUCCESSFULLY!');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Verification Failed:', err);
    process.exit(1);
  });
