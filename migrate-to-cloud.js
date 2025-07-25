import fs from 'fs';

// Configuration
const LOCAL_STRAPI_URL = 'http://localhost:1337/api';
const CLOUD_STRAPI_URL = 'https://supportive-baseball-03e494ce0b.strapiapp.com/api';

async function migrateContent() {
  try {
    console.log('🚀 Starting migration from local to Strapi Cloud...');
    
    // Step 1: Fetch all works from local Strapi
    console.log('📥 Fetching content from local Strapi...');
    const localResponse = await fetch(`${LOCAL_STRAPI_URL}/works?populate=*`);
    const localData = await localResponse.json();
    
    if (!localData.data || localData.data.length === 0) {
      console.log('❌ No content found in local Strapi');
      return;
    }
    
    console.log(`✅ Found ${localData.data.length} works in local Strapi`);
    
    // Step 2: Save to file for manual import
    const exportData = {
      data: localData.data,
      meta: localData.meta
    };
    
    fs.writeFileSync('strapi-export.json', JSON.stringify(exportData, null, 2));
    console.log('💾 Exported data saved to strapi-export.json');
    
    // Step 3: Display migration instructions
    console.log('\n📋 Migration Instructions:');
    console.log('1. Go to your Strapi Cloud admin: https://supportive-baseball-03e494ce0b.strapiapp.com/admin');
    console.log('2. Navigate to Content Manager → Works');
    console.log('3. Click "Import" and upload the strapi-export.json file');
    console.log('4. Publish the imported content');
    
    console.log('\n🎉 Migration script completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

// Run migration
migrateContent(); 