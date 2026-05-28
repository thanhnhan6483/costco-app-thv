const duckdb = require('duckdb');
const db = new duckdb.Database('./data/costco.duckdb');

// Tìm tháng 4/2026
db.all(`SELECT id FROM months WHERE month LIKE '%01/2026%' OR month LIKE '%4/2026%'`, (err, months) => {
  if (err) {
    console.error('Error finding month:', err);
    db.close();
    return;
  }
  
  console.log('Months found:', JSON.stringify(months, null, 2));
  
  if (months.length === 0) {
    console.log('No month 01/2026 found');
    db.close();
    return;
  }
  
  const monthId = months[0].id;
  console.log('\nQuerying departments for month:', monthId);
  
  // Lấy phòng ban
  db.all(`SELECT id, code, name, parent_id, note FROM departments WHERE month_id = ? ORDER BY code`, [monthId], (err, rows) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('\nDepartments in month 01/2026:');
      console.log(JSON.stringify(rows, null, 2));
      console.log('\nTotal:', rows.length, 'departments');
    }
    db.close();
  });
});
