#!/usr/bin/env node

/**
 * Simple Stripe Account Deletion Script
 * 
 * This script deletes specified Stripe accounts directly from Stripe.
 * It does NOT modify any local Firebase data - that's handled by the duplicate prevention logic.
 */

const path = require('path');
// Ensure dotenv loads .env from the server root directory
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

require('dotenv').config();
const { stripe } = require('../config/stripe');


// Accounts to delete from Stripe
const ACCOUNTS_TO_DELETE = [
    'acct_1Rrb3QDN0bK4Drxu',
    'acct_1RrTH3DRuh7AMw0a',
];

// Remove duplicates
const UNIQUE_ACCOUNTS = [...new Set(ACCOUNTS_TO_DELETE)];

console.log('🗑️  Stripe Account Deletion Script');
console.log(`📋 Accounts to delete: ${UNIQUE_ACCOUNTS.length} unique accounts`);

async function deleteStripeAccount(accountId) {
    console.log(`\n🔍 Processing account: ${accountId}`);
    
    try {
        // First, check if account exists
        const account = await stripe.accounts.retrieve(accountId);
        console.log(`  ✅ Account exists: ${account.email || 'no email'}`);
        console.log(`  📊 Status: charges_enabled=${account.charges_enabled}, payouts_enabled=${account.payouts_enabled}`);
        
        // Delete the account
        await stripe.accounts.del(accountId);
        console.log(`  🗑️  Successfully deleted: ${accountId}`);
        
        return { success: true, accountId, email: account.email };
        
    } catch (error) {
        if (error.code === 'resource_missing') {
            console.log(`  ⚠️  Account not found: ${accountId} (already deleted or never existed)`);
            return { success: true, accountId, note: 'already_missing' };
        } else {
            console.log(`  ❌ Failed to delete ${accountId}: ${error.message}`);
            return { success: false, accountId, error: error.message };
        }
    }
}

async function main() {
    console.log('\n🚀 Starting deletion process...');
    
    const results = [];
    
    for (const accountId of UNIQUE_ACCOUNTS) {
        const result = await deleteStripeAccount(accountId);
        results.push(result);
        
        // Small delay between deletions
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Summary
    console.log('\n📊 DELETION SUMMARY');
    console.log('==================');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Successfully processed: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    
    if (successful.length > 0) {
        console.log('\nSuccessfully processed:');
        successful.forEach(result => {
            const note = result.note ? ` (${result.note})` : '';
            console.log(`  - ${result.accountId}${note}`);
        });
    }
    
    if (failed.length > 0) {
        console.log('\nFailed:');
        failed.forEach(result => {
            console.log(`  - ${result.accountId}: ${result.error}`);
        });
    }
    
    console.log('\n✨ Script completed!');
    console.log('💡 Note: This only deletes from Stripe. Local Firebase data is handled by duplicate prevention logic.');
}

// Run if called directly
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('\n💥 Script failed:', error);
            process.exit(1);
        });
}

module.exports = { deleteStripeAccount, UNIQUE_ACCOUNTS };
