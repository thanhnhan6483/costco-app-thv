// Query departments via API
const API_BASE = 'http://localhost:3000';

async function queryDepartments() {
  try {
    // 1. Get all months
    console.log('Fetching months...');
    const monthsRes = await fetch(`${API_BASE}/api/months`);
    const months = await monthsRes.json();
    
    // Find month 04/2026
    const month042026 = months.find(m => m.month === '04/2026');
    
    if (!month042026) {
      console.log('Month 04/2026 not found!');
      console.log('Available months:', months.map(m => m.month).join(', '));
      return;
    }
    
    console.log('\nFound month:', month042026);
    
    // 2. Get departments for this month
    console.log('\nFetching departments for month:', month042026.id);
    const deptRes = await fetch(`${API_BASE}/api/departments?month=${month042026.id}`);
    const departments = await deptRes.json();
    
    console.log('\n=== PHÒNG BAN THÁNG 04/2026 ===\n');
    console.log('Total:', departments.length, 'departments\n');
    
    departments.forEach((dept, index) => {
      console.log(`${index + 1}. [${dept.code}] ${dept.name}`);
      if (dept.parentName) console.log(`   └─ Thuộc: ${dept.parentName}`);
      if (dept.note) console.log(`   └─ Ghi chú: ${dept.note}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nMake sure the dev server is running: npm run dev');
  }
}

queryDepartments();
