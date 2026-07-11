exports.main = async (event, context) => {
  const { sql } = event;
  
  console.log('=== sql-exec invoked ===');
  console.log('Event:', JSON.stringify(event).substring(0, 200));
  console.log('SQL:', sql ? sql.substring(0, 100) : 'null');
  
  if (!sql) {
    return { success: false, error: 'SQL parameter is required' };
  }

  try {
    console.log('Step 1: Checking credentials');
    
    const secretId = process.env.TENCENTCLOUD_SECRETID;
    const secretKey = process.env.TENCENTCLOUD_SECRETKEY;
    const sessionToken = process.env.TENCENTCLOUD_SESSIONTOKEN;
    
    console.log('SecretId present:', !!secretId);
    console.log('SecretKey present:', !!secretKey);
    console.log('SessionToken present:', !!sessionToken);

    if (!secretId || !secretKey) {
      return { success: false, error: 'TencentCloud credentials not available' };
    }

    console.log('Step 2: Importing tencentcloud-sdk-nodejs');
    try {
      const tcb = require('tencentcloud-sdk-nodejs/tencentcloud/services/tcb/v20180608');
      console.log('tcb module loaded:', Object.keys(tcb));
      console.log('tcb.v20180608:', Object.keys(tcb.v20180608));
    } catch (e) {
      console.error('Failed to import tcb:', e.message);
      return { success: false, error: 'Failed to import tencentcloud-sdk-nodejs: ' + e.message };
    }
    
    console.log('Step 3: Importing BasicCredential');
    try {
      const common = require('tencentcloud-sdk-nodejs/tencentcloud/common');
      console.log('common module exports:', Object.keys(common));
      console.log('BasicCredential:', typeof common.BasicCredential);
      
      if (typeof common.BasicCredential !== 'function') {
        return { success: false, error: 'BasicCredential is not a function: ' + typeof common.BasicCredential };
      }
    } catch (e) {
      console.error('Failed to import common:', e.message);
      return { success: false, error: 'Failed to import common: ' + e.message };
    }

    console.log('Step 4: Creating credential');
    try {
      const { BasicCredential } = require('tencentcloud-sdk-nodejs/tencentcloud/common');
      const credential = new BasicCredential(secretId, secretKey, sessionToken);
      console.log('Credential created successfully');
    } catch (e) {
      console.error('Failed to create credential:', e.message);
      return { success: false, error: 'Failed to create credential: ' + e.message };
    }

    console.log('Step 5: Creating client');
    const tcb = require('tencentcloud-sdk-nodejs/tencentcloud/services/tcb/v20180608');
    const { BasicCredential } = require('tencentcloud-sdk-nodejs/tencentcloud/common');
    const credential = new BasicCredential(secretId, secretKey, sessionToken);

    const client = new tcb.v20180608.Client({
      credential,
      region: process.env.TENCENTCLOUD_REGION || 'ap-guangzhou',
      profile: {
        httpProfile: {
          endpoint: 'tcb.tencentcloudapi.com',
        },
      },
    });
    console.log('Client created successfully');

    const params = {
      EnvId: process.env.SCF_NAMESPACE || process.env.CLOUDBASE_ENV_ID,
      Sql: sql
    };

    console.log('Step 6: Executing SQL');
    const result = await client.ExecutePGSql(params);
    console.log('API response:', JSON.stringify(result));
    
    return { success: true, data: result };
  } catch (error) {
    console.error('SQL execute error:', error.message);
    console.error('Error stack:', error.stack);
    return { success: false, error: error.message };
  }
};