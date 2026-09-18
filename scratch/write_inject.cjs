const fs = require('fs');
const sess = require('./sessions.json');
const joaoCode = `localStorage.setItem('sb-alneozvrsuwszlkisbyo-auth-token', JSON.stringify(${JSON.stringify(sess.joao)})); location.href = '/';`;
const adminCode = `localStorage.setItem('sb-alneozvrsuwszlkisbyo-auth-token', JSON.stringify(${JSON.stringify(sess.admin)})); location.href = '/';`;
fs.writeFileSync('scratch/inject_joao.js', joaoCode);
fs.writeFileSync('scratch/inject_admin.js', adminCode);
console.log('Successfully wrote inject_joao.js and inject_admin.js');
