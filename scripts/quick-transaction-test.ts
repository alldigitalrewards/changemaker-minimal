import { generateRewardStackToken, getRewardStackBaseUrl } from '../lib/rewardstack/auth';

async function main() {
  const workspaceId = '506b0781-cf82-4005-affe-210063cba12a';
  const programId = 'adr-changemaker-qa';
  const participantId = '28c43ddc-be84-11f0-88b7-a6b84bc3bf54'; // AZ address

  const token = await generateRewardStackToken(workspaceId);
  const baseUrl = await getRewardStackBaseUrl(workspaceId);

  const url = `${baseUrl}/api/program/${encodeURIComponent(programId)}/participant/${encodeURIComponent(participantId)}/transaction`;

  const payload = {
    products: [
      {
        sku: 'APPLEWTCH',
        quantity: 1,
      },
    ],
    shipping: {
      firstname: 'Jack',
      lastname: 'Felke',
      address1: '7272 E Indian School Rd',
      address2: '',
      city: 'Scottsdale',
      state: 'AZ',
      zip: '85251',
      country: '840',
    },
    issue_points: true,
    metadata: {
      test_transaction: true,
    },
  };

  console.log('Testing catalog transaction with "shipping" property and issue_points...');
  console.log('URL:', url);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  console.log('\nResponse:', response.status, response.statusText);
  const body = await response.text();
  console.log('Body:', body);

  if (response.ok) {
    console.log('\n✅ SUCCESS! Catalog transaction worked with CA address!');
  } else {
    console.log('\n❌ FAILED - Same error with CA address');
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit());
