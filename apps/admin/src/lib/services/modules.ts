import { prisma } from '@school-erp/db';

let modulesCache: Record<string, boolean> | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds TTL

export function clearModulesCache() {
  modulesCache = null;
  lastCacheTime = 0;
}

export async function initializeModules(tx: any) {
  const defaultModules = [
    { key: 'DASHBOARD', name: 'Dashboard', type: 'CORE', enabled: true, version: 'v1', desc: 'Main school summary metrics desk' },
    { key: 'ADMISSIONS', name: 'Admissions', type: 'CORE', enabled: true, version: 'v1', desc: 'Student registrations and leads pipeline' },
    { key: 'PARENTS', name: 'Parents', type: 'CORE', enabled: true, version: 'v1', desc: 'Family contact directory profiles' },
    { key: 'STUDENTS', name: 'Students', type: 'CORE', enabled: true, version: 'v1', desc: 'Active pupil profiles registry' },
    { key: 'CLASSES', name: 'Classes & Sections', type: 'CORE', enabled: true, version: 'v1', desc: 'Grade structure configurations' },
    { key: 'SESSIONS', name: 'Academic Sessions', type: 'CORE', enabled: true, version: 'v1', desc: 'Annual session logs' },
    { key: 'FEES', name: 'Fee Management', type: 'CORE', enabled: true, version: 'v1', desc: 'Fee plan structure configuration' },
    { key: 'FEES_COLLECTION', name: 'Fee Collection', type: 'CORE', enabled: true, version: 'v1', desc: 'Dues collection' },
    { key: 'RECEIPTS', name: 'Receipts', type: 'CORE', enabled: true, version: 'v1', desc: 'Invoicing transaction logs' },
    { key: 'PROMOTIONS', name: 'Promotions', type: 'CORE', enabled: true, version: 'v1', desc: 'Student advancement desks' },
    { key: 'REPORTS', name: 'Reports', type: 'CORE', enabled: true, version: 'v1', desc: 'Data aggregates reports desk' },
    { key: 'SETTINGS', name: 'Settings', type: 'CORE', enabled: true, version: 'v1', desc: 'School settings console' },
    
    // Optional modules
    { key: 'ATTENDANCE', name: 'Attendance', type: 'OPTIONAL', enabled: true, version: 'v1', desc: 'Daily attendance logs' },
    { key: 'EXAMS', name: 'Examinations', type: 'OPTIONAL', enabled: true, version: 'v1', desc: 'Subject exams logs' },
    { key: 'RESULTS', name: 'Results', type: 'OPTIONAL', enabled: true, version: 'v1', desc: 'Dense rank mark sheets publication' },
    { key: 'TRANSPORT', name: 'Transport', type: 'OPTIONAL', enabled: true, version: 'v1', desc: 'Bus route tracking and prorated billing' },
    { key: 'HR', name: 'Staff Management (HR)', type: 'OPTIONAL', enabled: true, version: 'v1', desc: 'Employee onboarding details desk' },
    { key: 'SALARY', name: 'Salary', type: 'OPTIONAL', enabled: true, version: 'v1', desc: 'Employee pay slip disbursements logs' },
    { key: 'COMMUNICATIONS', name: 'Communications', type: 'OPTIONAL', enabled: true, version: 'v1', desc: 'Admin notice board announcements' },
    { key: 'WEBSITE', name: 'Website', type: 'OPTIONAL', enabled: true, version: 'v1', desc: 'School portal console editor' },
    { key: 'GALLERY', name: 'Gallery', type: 'OPTIONAL', enabled: true, version: 'v1', desc: 'School image gallery' },

    // Future modules
    { key: 'LIBRARY', name: 'Library', type: 'FUTURE', enabled: false, version: 'v2', desc: 'Book logs tracking desk' },
    { key: 'HOSTEL', name: 'Hostel', type: 'FUTURE', enabled: false, version: 'v2', desc: 'Dorm room allotments roster' },
    { key: 'SMS', name: 'SMS Alerts', type: 'FUTURE', enabled: false, version: 'v2', desc: 'Text broadcasts system' },
    { key: 'WHATSAPP', name: 'WhatsApp Alerts', type: 'FUTURE', enabled: false, version: 'v2', desc: 'WhatsApp broadcasts system' },
    { key: 'ONLINE_ADMISSION', name: 'Online Admission', type: 'FUTURE', enabled: false, version: 'v2', desc: 'Public portal admissions forms' },
    { key: 'PARENT_PORTAL', name: 'Parent Portal', type: 'FUTURE', enabled: false, version: 'v2', desc: 'Parent dashboard desk' },
    { key: 'STUDENT_PORTAL', name: 'Student Portal', type: 'FUTURE', enabled: false, version: 'v2', desc: 'Student dashboard desk' }
  ];

  for (const m of defaultModules) {
    await tx.moduleSetting.upsert({
      where: { moduleKey: m.key },
      update: {},
      create: {
        moduleKey: m.key,
        moduleName: m.name,
        type: m.type as any,
        status: m.type === 'FUTURE' ? 'COMING_SOON' : 'ACTIVE',
        enabled: m.enabled,
        version: m.version,
        description: m.desc
      }
    });
  }

  const defaultDeps = [
    { moduleKey: 'ATTENDANCE', dependsOnModuleKey: 'STUDENTS' },
    { moduleKey: 'EXAMS', dependsOnModuleKey: 'STUDENTS' },
    { moduleKey: 'RESULTS', dependsOnModuleKey: 'EXAMS' },
    { moduleKey: 'TRANSPORT', dependsOnModuleKey: 'FEES' },
    { moduleKey: 'SALARY', dependsOnModuleKey: 'HR' },
    { moduleKey: 'GALLERY', dependsOnModuleKey: 'WEBSITE' }
  ];

  for (const d of defaultDeps) {
    await tx.moduleDependency.upsert({
      where: {
        moduleKey_dependsOnModuleKey: {
          moduleKey: d.moduleKey,
          dependsOnModuleKey: d.dependsOnModuleKey
        }
      },
      update: {},
      create: {
        moduleKey: d.moduleKey,
        dependsOnModuleKey: d.dependsOnModuleKey
      }
    });
  }
}

export async function loadModulesToCache() {
  // If the DB has no entries, initialize them
  const count = await prisma.moduleSetting.count();
  if (count === 0) {
    await prisma.$transaction(async (tx) => {
      await initializeModules(tx);
    });
  }

  const settings = await prisma.moduleSetting.findMany();
  const cache: Record<string, boolean> = {};
  for (const s of settings) {
    cache[s.moduleKey] = s.enabled;
  }
  modulesCache = cache;
  lastCacheTime = Date.now();
}

export async function isModuleEnabled(key: string): Promise<boolean> {
  const now = Date.now();
  if (!modulesCache || now - lastCacheTime > CACHE_TTL) {
    await loadModulesToCache();
  }
  if (modulesCache && key in modulesCache) {
    return modulesCache[key];
  }
  return false;
}

export async function getEnabledModules(): Promise<string[]> {
  const now = Date.now();
  if (!modulesCache || now - lastCacheTime > CACHE_TTL) {
    await loadModulesToCache();
  }
  const enabled: string[] = [];
  if (modulesCache) {
    for (const key of Object.keys(modulesCache)) {
      if (modulesCache[key]) {
        enabled.push(key);
      }
    }
  }
  return enabled;
}

export async function getModuleSettings() {
  const count = await prisma.moduleSetting.count();
  if (count === 0) {
    await prisma.$transaction(async (tx) => {
      await initializeModules(tx);
    });
  }

  return await prisma.moduleSetting.findMany({
    include: {
      dependencies: {
        select: { dependsOnModuleKey: true }
      }
    },
    orderBy: { moduleKey: 'asc' }
  });
}

async function disableModuleRecursive(tx: any, key: string, disabledList: string[] = []) {
  const dependents = await tx.moduleDependency.findMany({
    where: { dependsOnModuleKey: key }
  });

  for (const dep of dependents) {
    if (!disabledList.includes(dep.moduleKey)) {
      await tx.moduleSetting.update({
        where: { moduleKey: dep.moduleKey },
        data: { enabled: false }
      });
      disabledList.push(dep.moduleKey);
      await disableModuleRecursive(tx, dep.moduleKey, disabledList);
    }
  }
  return disabledList;
}

export async function updateModuleStatus(
  key: string,
  enabled: boolean,
  userId: string
): Promise<{ success: boolean; disabledDependents?: string[] }> {
  return await prisma.$transaction(async (tx) => {
    // Ensure initialized
    await initializeModules(tx);

    const moduleObj = await tx.moduleSetting.findUniqueOrThrow({
      where: { moduleKey: key }
    });

    if (moduleObj.type === 'CORE') {
      throw new Error(`Cannot modify status of CORE module: ${key}`);
    }
    if (moduleObj.type === 'FUTURE') {
      throw new Error(`Cannot modify status of FUTURE module: ${key}`);
    }

    let disabledDependents: string[] = [];

    if (enabled) {
      // Check dependencies
      const deps = await tx.moduleDependency.findMany({
        where: { moduleKey: key },
        include: { dependsOn: true }
      });

      for (const d of deps) {
        if (!d.dependsOn.enabled) {
          throw new Error(`Cannot enable ${key} because it depends on disabled module ${d.dependsOnModuleKey}.`);
        }
      }

      await tx.moduleSetting.update({
        where: { moduleKey: key },
        data: { enabled: true }
      });
    } else {
      // Disabling module: recursively disable dependents
      await tx.moduleSetting.update({
        where: { moduleKey: key },
        data: { enabled: false }
      });
      disabledDependents = await disableModuleRecursive(tx, key, []);
    }

    // Write audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: enabled ? 'ENABLE_MODULE' : 'DISABLE_MODULE',
        details: enabled 
          ? `Enabled ${moduleObj.moduleName} module.`
          : `Disabled ${moduleObj.moduleName} module.${disabledDependents.length > 0 ? ` Recursively disabled dependents: ${disabledDependents.join(', ')}` : ''}`
      }
    });

    // Clear memory cache immediately
    clearModulesCache();

    return { success: true, disabledDependents };
  });
}

export async function applyProfilePreset(presetName: string, userId: string): Promise<void> {
  return await prisma.$transaction(async (tx) => {
    await initializeModules(tx);

    const presets: Record<string, string[]> = {
      'Primary School': ['ATTENDANCE', 'COMMUNICATIONS', 'WEBSITE', 'GALLERY'],
      'High School': ['ATTENDANCE', 'EXAMS', 'RESULTS', 'TRANSPORT', 'HR', 'SALARY', 'COMMUNICATIONS', 'WEBSITE', 'GALLERY'],
      'Senior Secondary': ['ATTENDANCE', 'EXAMS', 'RESULTS', 'TRANSPORT', 'HR', 'SALARY', 'COMMUNICATIONS', 'WEBSITE', 'GALLERY'],
      'Coaching Institute': ['EXAMS', 'RESULTS', 'HR', 'SALARY', 'COMMUNICATIONS'],
      'Play School': ['ATTENDANCE', 'TRANSPORT', 'HR', 'SALARY', 'COMMUNICATIONS']
    };

    const targetList = presets[presetName];
    if (!targetList) {
      throw new Error(`Unknown preset: ${presetName}`);
    }

    // Disable all optional modules first
    await tx.moduleSetting.updateMany({
      where: { type: 'OPTIONAL' },
      data: { enabled: false }
    });

    // Enable modules in preset
    for (const key of targetList) {
      await tx.moduleSetting.update({
        where: { moduleKey: key },
        data: { enabled: true }
      });
    }

    // Write audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: 'APPLY_PRESET',
        details: `Applied academic preset "${presetName}", configuring optional modules.`
      }
    });

    // Clear local cache
    clearModulesCache();
  });
}
