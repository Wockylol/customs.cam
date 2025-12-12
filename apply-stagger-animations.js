#!/usr/bin/env node

/**
 * Automated Script to Apply Staggered Animations to All Pages
 * 
 * This script automatically adds StaggerContainer to all page components
 * that don't already have staggered animations applied.
 * 
 * Usage: node apply-stagger-animations.js
 */

const fs = require('fs');
const path = require('path');

// Pages to update (excluding already completed and mobile/public pages)
const pagesToUpdate = [
  'AgenciesList.tsx',
  'AgencyAllCustoms.tsx',
  'AgencyClientsList.tsx',
  'AgencyMetrics.tsx',
  'AllCustoms.tsx',
  'AllSalesView.tsx',
  'Assignments.tsx',
  'Attendance.tsx',
  'Calls.tsx',
  'ChatterPerformance.tsx',
  'ClientChatsPage.tsx',
  'ClientCustomsView.tsx',
  'ClientDataManagement.tsx',
  'ClientProfilePage.tsx',
  'DebugLogsPage.tsx',
  'MyCustoms.tsx',
  'NotificationsPage.tsx',
  'PayrollSheet.tsx',
  'PendingCompletion.tsx',
  'PendingDelivery.tsx',
  'PendingSalesApproval.tsx',
  'PendingTeamApproval.tsx',
  'PlatformAssignmentsOverview.tsx',
  'SalesManagement.tsx',
  'SceneAssignments.tsx',
  'SceneLibrary.tsx',
  'SMSMessaging.tsx',
  'UserApprovals.tsx'
];

const pagesDir = path.join(__dirname, 'src', 'pages');

function applyStaggerAnimations(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if already has StaggerContainer import
    if (content.includes('StaggerContainer')) {
      console.log(`⏭️  Skipping ${path.basename(filePath)} - already has StaggerContainer`);
      return false;
    }

    // Step 1: Add import statement
    // Find the last import statement and add our import after it
    const importRegex = /^import\s+.*?from\s+['"].*?['"];?\s*$/gm;
    let lastImportIndex = 0;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      lastImportIndex = match.index + match[0].length;
    }
    
    if (lastImportIndex === 0) {
      console.log(`⚠️  Warning: Could not find import statements in ${path.basename(filePath)}`);
      return false;
    }
    
    const importStatement = "\nimport { StaggerContainer } from '../components/ui/StaggerContainer';";
    content = content.slice(0, lastImportIndex) + importStatement + content.slice(lastImportIndex);

    // Step 2: Replace <div className="space-y-X"> with <StaggerContainer className="space-y-X">
    // This regex looks for div with space-y-* className within Layout component
    const layoutContentRegex = /(<Layout[^>]*>\s*)<div className="(space-y-\d+[^"]*)"/g;
    content = content.replace(layoutContentRegex, '$1<StaggerContainer className="$2"');

    // Step 3: Replace the corresponding closing </div> with </StaggerContainer>
    // Find the matching closing div before </Layout>
    // This is trickier - we'll look for </div>\s*</Layout> pattern
    const closingRegex = /(<\/div>)(\s*<\/Layout>)/g;
    let replacements = 0;
    content = content.replace(closingRegex, (match, div, layout) => {
      if (replacements === 0) {
        replacements++;
        return '</StaggerContainer>' + layout;
      }
      return match;
    });

    // Write the modified content back
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated ${path.basename(filePath)}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error processing ${path.basename(filePath)}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🚀 Starting automated staggered animation application...\n');
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const pageFile of pagesToUpdate) {
    const filePath = path.join(pagesDir, pageFile);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${pageFile}`);
      errorCount++;
      continue;
    }

    const result = applyStaggerAnimations(filePath);
    if (result === true) {
      successCount++;
    } else if (result === false && !result) {
      skipCount++;
    } else {
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`✅ Successfully updated: ${successCount} pages`);
  console.log(`⏭️  Skipped (already done): ${skipCount} pages`);
  console.log(`❌ Errors: ${errorCount} pages`);
  console.log('='.repeat(50));
  
  if (successCount > 0) {
    console.log('\n🎉 Animation updates complete!');
    console.log('💡 Run your dev server to see the smooth cascade animations.');
  }
}

// Run the script
main();

