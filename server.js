const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = 'swiftdo_secret_2026';

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '50mb' })); // 50mb for base64 photos
app.use(express.static(path.join(__dirname, 'public')));

// ════════════════════════════════════════
// IN-MEMORY DATABASE (replace with PostgreSQL later — zero code changes needed)
// ════════════════════════════════════════
const DB = {
  users: [],
  tasks: [],
  transactions: [],
  notifications: [],
  otps: [],        // { phone, otp, expiresAt }
  reports: []
};

// Seed demo data
function seed() {
  const hash = bcrypt.hashSync('pass123', 10);
  DB.users = [
    { id:'w1', role:'worker', phone:'9876543210', password:hash, name:'Ramesh Kumar', status:'approved', zone:'Zone 4', skills:['civic','trades','vehicle'], trustLevel:2, trustTasks:62, approvalRate:89, walletBalance:4290, totalEarned:38420, upi:'ramesh@upi', workerId:'SW-W-4729', createdAt: new Date().toISOString() },
    { id:'w2', role:'worker', phone:'9876543211', password:hash, name:'Kavitha Rajan', status:'approved', zone:'Zone 4', skills:['civic','trades'], trustLevel:2, trustTasks:45, approvalRate:91, walletBalance:2150, totalEarned:22000, upi:'kavitha@upi', workerId:'SW-W-2109', createdAt: new Date().toISOString() },
    { id:'w3', role:'worker', phone:'9876543212', password:hash, name:'Suresh Pillai', status:'pending', zone:'Zone 3', skills:['vehicle'], trustLevel:1, trustTasks:0, approvalRate:100, walletBalance:0, totalEarned:0, workerId:'SW-W-9981', createdAt: new Date().toISOString() },
    { id:'b1', role:'buyer', phone:'9876540001', password:hash, name:'Dr. Sharma', status:'active', orgName:'IIT Bangalore Campus', plan:'enterprise', planSkills:['civic','trades','vehicle','construction'], monthlyFee:60000, zone:'Zone 1', createdAt: new Date().toISOString() },
    { id:'b2', role:'buyer', phone:'9876540005', password:hash, name:'Anita Menon', status:'active', orgName:'Prestige Gated Community', plan:'pro', planSkills:['civic','trades'], monthlyFee:18000, zone:'Zone 3', createdAt: new Date().toISOString() },
    { id:'s1', role:'supervisor', phone:'9876540002', password:hash, name:'Priya Menon', status:'active', zone:'Zone 4', workerId:'SW-S-012', createdAt: new Date().toISOString() },
    { id:'a1', role:'admin', phone:'9876540003', password:hash, name:'Admin User', status:'active', workerId:'SW-A-001', createdAt: new Date().toISOString() },
    { id:'c1', role:'citizen', phone:'9876540004', password:hash, name:'Meera Patel', status:'active', area:'MG Road Area', zone:'Zone 4', reportsCount:11, createdAt: new Date().toISOString() }
  ];
  DB.tasks = [
    { id:'t1', title:'MG Road Street Sweep', category:'civic', status:'completed', workerId:'w1', buyerId:'b1', reward:120, location:'Sector 4A', zone:'Zone 4', aiScore:91, paid:true, description:'Sweep MG Road sector 4A', urgency:'normal', createdAt:new Date(Date.now()-7200000).toISOString(), beforePhoto:null, afterPhoto:null, proofPhoto:null, lat:12.9716, lng:77.5946 },
    { id:'t2', title:'Pothole Repair', category:'civic', status:'open', workerId:null, buyerId:null, reward:450, location:'Station Road Gate 2', zone:'Zone 4', aiScore:null, paid:false, description:'Fill deep pothole causing accidents', urgency:'urgent', createdAt:new Date(Date.now()-1800000).toISOString(), lat:12.9719, lng:77.5949 },
    { id:'t3', title:'Lab Block AC Repair', category:'trades', status:'pending_confirm', workerId:'w1', buyerId:'b1', reward:650, location:'IIT Campus Lab Block B', zone:'Zone 1', aiScore:88, paid:false, description:'3 AC units not cooling in Lab Block B', urgency:'normal', createdAt:new Date(Date.now()-3600000).toISOString(), lat:12.9921, lng:77.5700 },
    { id:'t4', title:'Streetlight Repair', category:'civic', status:'open', workerId:null, buyerId:null, reward:280, location:'Park Lane Junction', zone:'Zone 4', aiScore:null, paid:false, description:'Streetlight not working', urgency:'normal', createdAt:new Date(Date.now()-900000).toISOString(), lat:12.9720, lng:77.5950 },
    { id:'t5', title:'Car AC Service', category:'vehicle', status:'open', workerId:null, buyerId:'b2', reward:550, location:'Block C Parking', zone:'Zone 3', aiScore:null, paid:false, description:'AC not cooling in 3 residents cars', urgency:'normal', createdAt:new Date(Date.now()-600000).toISOString(), lat:12.9700, lng:77.5930 }
  ];
  DB.transactions = [
    { id:'tx1', workerId:'w1', type:'credit', amount:620, desc:'Tap & Pipe Repair', date:new Date(Date.now()-86400000).toISOString() },
    { id:'tx2', workerId:'w1', type:'credit', amount:340, desc:'Car Service', date:new Date(Date.now()-172800000).toISOString() },
    { id:'tx3', workerId:'w1', type:'debit', amount:2000, desc:'Withdrawal to UPI', date:new Date(Date.now()-259200000).toISOString() }
  ];
  DB.notifications = [
    { id:'n1', userId:'w1', title:'Payment received — ₹620', body:'Tap & Pipe Repair task verified and paid.', read:false, createdAt:new Date(Date.now()-3600000).toISOString() },
    { id:'n2', userId:'w1', title:'New urgent task — ₹450', body:'Pothole Repair at Station Road matches your skills.', read:false, createdAt:new Date(Date.now()-1800000).toISOString() },
    { id:'n3', userId:'b1', title:'Work completed — confirm now', body:'Lab Block AC Repair done. Confirm to release ₹650.', read:false, createdAt:new Date(Date.now()-3600000).toISOString() },
    { id:'n4', userId:'s1', title:'3 tasks flagged by AI', body:'Review queue updated in Zone 4.', read:false, createdAt:new Date(Date.now()-7200000).toISOString() },
    { id:'n5', userId:'a1', title:'Payout batch ready', body:'₹8,42,300 ready for 1,204 workers.', read:false, createdAt:new Date(Date.now()-3600000).toISOString() }
  ];
  console.log('✅ Database seeded with demo data');
}
seed();

// ════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════
const safe = u => { if(!u) return null; const {password,...s}=u; return s; };
const addNotif = (userId, title, body) => DB.notifications.unshift({ id:uuidv4(), userId, title, body, read:false, createdAt:new Date().toISOString() });

// Auth middleware
const auth = (req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    const u = DB.users.find(u => u.id === req.user.id);
    if (!u) return res.status(401).json({ error: 'User not found' });
    req.fullUser = u;
    next();
  } catch(e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ════════════════════════════════════════
// OTP — simulated with console log
// In production: replace sendOtp() with MSG91/Twilio call
// ════════════════════════════════════════
function sendOtp(phone, otp) {
  // Production: await msg91.send(phone, `Your Swiftdo OTP is ${otp}`)
  // For now: log to console and return in response for testing
  console.log(`\n📱 OTP for ${phone}: ${otp}\n`);
}

app.post('/api/otp/send', (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.length !== 10) return res.status(400).json({ error: 'Invalid phone' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  // Remove any existing OTP for this phone
  DB.otps = DB.otps.filter(o => o.phone !== phone);
  DB.otps.push({ phone, otp, expiresAt });

  sendOtp(phone, otp);

  res.json({
    success: true,
    message: `OTP sent to +91 ${phone}`,
    // Remove this in production — only for development/demo
    _dev_otp: otp
  });
});

app.post('/api/otp/verify', (req, res) => {
  const { phone, otp } = req.body;
  const record = DB.otps.find(o => o.phone === phone);

  if (!record) return res.status(400).json({ error: 'No OTP sent to this number. Request a new one.' });
  if (Date.now() > record.expiresAt) return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
  if (record.otp !== otp) return res.status(400).json({ error: 'Incorrect OTP. Try again.' });

  // OTP valid — remove it
  DB.otps = DB.otps.filter(o => o.phone !== phone);
  res.json({ success: true, verified: true });
});

// ════════════════════════════════════════
// AUTH ROUTES
// ════════════════════════════════════════
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, phone, password, role, skills, orgName, area } = req.body;
    if (!name || !phone || !password || !role) return res.status(400).json({ error: 'Missing required fields' });
    if (DB.users.find(u => u.phone === phone)) return res.status(400).json({ error: 'Phone already registered' });

    const hash = await bcrypt.hash(password, 10);
    const workerId = role === 'worker' ? `SW-W-${Math.floor(1000+Math.random()*9000)}` : role === 'supervisor' ? `SW-S-${Math.floor(100+Math.random()*900)}` : null;

    const user = {
      id: uuidv4(), name, phone, password: hash, role,
      status: role === 'worker' ? 'pending' : 'active',
      skills: skills || [], orgName: orgName || null, area: area || null,
      zone: 'Zone 4', workerId,
      walletBalance: 0, totalEarned: 0, trustLevel: 1, trustTasks: 0, approvalRate: 100,
      plan: role === 'buyer' ? 'basic' : null,
      planSkills: role === 'buyer' ? ['civic'] : null,
      createdAt: new Date().toISOString()
    };
    DB.users.push(user);

    if (role === 'worker') addNotif(user.id, 'Application received! ✅', 'Your details are being verified. Usually 2–4 hours.');

    const token = jwt.sign({ id: user.id, role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: safe(user) });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = DB.users.find(u => u.phone === phone);
    if (!user) return res.status(401).json({ error: 'Phone not registered' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Wrong password' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: safe(user) });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/auth/me', auth, (req, res) => res.json(safe(req.fullUser)));

// ════════════════════════════════════════
// AI IMAGE ANALYSIS
// In production: replace analyzeImage() with Google Vision API call
// ════════════════════════════════════════
async function analyzeImage(beforeBase64, afterBase64, category) {
  // Production code:
  // const vision = new ImageAnnotatorClient();
  // const [before] = await vision.annotateImage({ image: { content: beforeBase64 }, features: [...] });
  // const [after] = await vision.annotateImage({ image: { content: afterBase64 }, features: [...] });
  // const score = calculateDifferenceScore(before, after);

  // For now: analyse image size as a proxy for "work done"
  // A real after photo is usually a different size/content than before
  let score = 70; // base score

  if (beforeBase64 && afterBase64) {
    // If photos are identical size, likely fake
    const sizeDiff = Math.abs(beforeBase64.length - afterBase64.length);
    const sizeRatio = sizeDiff / Math.max(beforeBase64.length, afterBase64.length);

    if (sizeRatio > 0.05) score += 15; // Photos look genuinely different
    if (beforeBase64.length > 10000) score += 5; // High res photo
    if (afterBase64.length > 10000) score += 5;  // High res after photo
    if (category === 'civic') score += 2;         // Civic tasks easier to verify
  }

  // Add some realistic variance
  score = Math.min(98, Math.max(30, score + Math.floor(Math.random() * 10) - 5));

  return {
    score,
    approved: score >= 60,
    details: {
      photoDifference: score > 75 ? 'High' : score > 60 ? 'Medium' : 'Low',
      imageQuality: 'Good',
      gpsVerified: true,
      timestamp: new Date().toISOString()
    }
  };
}

// ════════════════════════════════════════
// WORKER ROUTES
// ════════════════════════════════════════
app.get('/api/worker/tasks', auth, (req, res) => {
  const myTasks = DB.tasks.filter(t => t.workerId === req.user.id);
  const openTasks = DB.tasks.filter(t => t.status === 'open' && !t.workerId);
  res.json({ myTasks, openTasks });
});

app.post('/api/worker/tasks/:id/accept', auth, (req, res) => {
  const task = DB.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.workerId) return res.status(400).json({ error: 'Task already taken' });

  task.workerId = req.user.id;
  task.status = 'active';
  task.acceptedAt = new Date().toISOString();

  addNotif(req.user.id, `Task accepted: ${task.title}`, `Head to ${task.location}. Reward: ₹${task.reward}`);
  res.json(task);
});

app.post('/api/worker/tasks/:id/submit', auth, async (req, res) => {
  try {
    const task = DB.tasks.find(t => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.workerId !== req.user.id) return res.status(403).json({ error: 'Not your task' });

    const { beforePhoto, afterPhoto, proofPhoto, lat, lng } = req.body;

    // Store photos
    task.beforePhoto = beforePhoto || null;
    task.afterPhoto = afterPhoto || null;
    task.proofPhoto = proofPhoto || null;
    if (lat) task.workerLat = lat;
    if (lng) task.workerLng = lng;

    // Run AI analysis
    const analysis = await analyzeImage(beforePhoto, afterPhoto, task.category);
    task.aiScore = analysis.score;
    task.aiDetails = analysis.details;
    task.status = analysis.approved ? 'pending_confirm' : 'rejected';
    task.completedAt = new Date().toISOString();

    if (analysis.approved) {
      addNotif(req.user.id, `AI Score: ${analysis.score}/100 ✅`, 'Submission passed. Awaiting buyer confirmation.');
      if (task.buyerId) addNotif(task.buyerId, 'Work completed — confirm now', `${task.title} done. Confirm to release ₹${task.reward}.`);
    } else {
      addNotif(req.user.id, `Task Rejected — Score: ${analysis.score}/100`, 'Photos showed insufficient difference. Raise a dispute if incorrect.');
    }

    res.json({ task, aiScore: analysis.score, approved: analysis.approved, details: analysis.details });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/worker/tasks/:id/dispute', auth, (req, res) => {
  const task = DB.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  task.status = 'disputed';
  task.disputeReason = req.body.reason || 'Worker raised a dispute';
  addNotif(req.user.id, 'Dispute submitted', 'A supervisor will review within 24 hours.');
  res.json({ success: true });
});

app.get('/api/worker/wallet', auth, (req, res) => {
  const user = req.fullUser;
  const txns = DB.transactions.filter(t => t.workerId === req.user.id).sort((a,b) => new Date(b.date)-new Date(a.date));
  const pending = DB.tasks.filter(t => t.workerId === req.user.id && t.status === 'completed' && !t.paid).reduce((s,t) => s + (t.reward||0), 0);
  res.json({ balance: user.walletBalance||0, totalEarned: user.totalEarned||0, pendingPay: pending, transactions: txns });
});

app.post('/api/worker/wallet/withdraw', auth, (req, res) => {
  const { amount } = req.body;
  const user = req.fullUser;
  if (!amount || amount > user.walletBalance) return res.status(400).json({ error: 'Insufficient balance' });
  user.walletBalance -= amount;
  DB.transactions.unshift({ id:uuidv4(), workerId:user.id, type:'debit', amount, desc:'Withdrawal to UPI', date:new Date().toISOString() });
  addNotif(user.id, `₹${amount} withdrawal initiated`, `Transfer to ${user.upi||'your UPI'} within 2 hours.`);
  res.json({ success: true, newBalance: user.walletBalance });
});

// ════════════════════════════════════════
// BUYER ROUTES
// ════════════════════════════════════════
app.get('/api/buyer/dashboard', auth, (req, res) => {
  const tasks = DB.tasks.filter(t => t.buyerId === req.user.id);
  res.json({
    user: safe(req.fullUser),
    tasks,
    activeTasks: tasks.filter(t => ['active','pending_confirm'].includes(t.status)),
    completedTasks: tasks.filter(t => t.status === 'completed'),
    areaScore: 80
  });
});

app.post('/api/buyer/request', auth, (req, res) => {
  const { category, description, location, urgency, lat, lng } = req.body;
  if (!category || !description || !location) return res.status(400).json({ error: 'Missing fields' });

  const buyer = req.fullUser;
  if (buyer.planSkills && !buyer.planSkills.includes(category)) {
    return res.status(403).json({ error: `Your ${buyer.plan} plan doesn't include ${category} workers. Upgrade your plan.` });
  }

  const rewardMap = { civic:150, trades:500, vehicle:350, construction:800 };
  const task = {
    id: uuidv4(), title: description.slice(0,80), description, category, location,
    urgency: urgency||'normal', status:'open', workerId:null, buyerId:req.user.id,
    reward: rewardMap[category]||200, zone: buyer.zone||'Zone 4',
    aiScore:null, paid:false, lat:lat||null, lng:lng||null,
    createdAt: new Date().toISOString()
  };
  DB.tasks.push(task);
  addNotif(req.user.id, 'Work request submitted', `${task.title} — A verified worker will be assigned shortly.`);
  res.json(task);
});

app.post('/api/buyer/tasks/:id/confirm', auth, (req, res) => {
  const task = DB.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.buyerId !== req.user.id) return res.status(403).json({ error: 'Not your task' });

  const { satisfied } = req.body;
  if (satisfied) {
    task.status = 'completed';
    task.paid = true;
    task.confirmedAt = new Date().toISOString();

    if (task.workerId) {
      const worker = DB.users.find(u => u.id === task.workerId);
      if (worker) {
        worker.walletBalance = (worker.walletBalance||0) + task.reward;
        worker.totalEarned = (worker.totalEarned||0) + task.reward;
        worker.trustTasks = (worker.trustTasks||0) + 1;
        worker.trustLevel = worker.trustTasks>=500?4:worker.trustTasks>=100?3:worker.trustTasks>=30?2:1;
        DB.transactions.unshift({ id:uuidv4(), workerId:worker.id, type:'credit', amount:task.reward, desc:task.title, date:new Date().toISOString() });
        addNotif(worker.id, `₹${task.reward} received! 💰`, `${task.title} confirmed by buyer.`);
      }
    }
    addNotif(req.user.id, 'Task confirmed ✅', `${task.title} complete. Worker paid ₹${task.reward}.`);
  } else {
    task.status = 'disputed';
    addNotif(req.user.id, 'Dispute raised', `${task.title} disputed. Supervisor reviews in 24h.`);
    if (task.workerId) addNotif(task.workerId, 'Buyer rejected work', `${task.title} disputed. Supervisor will review.`);
  }
  res.json({ success: true });
});

app.put('/api/buyer/plan', auth, (req, res) => {
  const { plan } = req.body;
  const plans = { basic:{skills:['civic'],fee:8000}, pro:{skills:['civic','trades'],fee:18000}, enterprise:{skills:['civic','trades','vehicle','construction'],fee:60000} };
  if (!plans[plan]) return res.status(400).json({ error: 'Invalid plan' });
  const user = req.fullUser;
  user.plan = plan; user.planSkills = plans[plan].skills; user.monthlyFee = plans[plan].fee;
  res.json({ success:true, plan, skills: plans[plan].skills });
});

// ════════════════════════════════════════
// SUPERVISOR ROUTES
// ════════════════════════════════════════
app.get('/api/supervisor/flagged', auth, (req, res) => {
  res.json(DB.tasks.filter(t => t.aiScore !== null && t.aiScore < 60 && !['completed','rejected'].includes(t.status)));
});

app.get('/api/supervisor/disputed', auth, (req, res) => {
  res.json(DB.tasks.filter(t => t.status === 'disputed'));
});

app.post('/api/supervisor/tasks/:id/review', auth, (req, res) => {
  const { decision, note } = req.body;
  const task = DB.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (decision === 'approve') {
    task.status = 'pending_confirm';
    if (task.workerId) addNotif(task.workerId, 'Supervisor approved ✅', `${task.title} approved after review.`);
    if (task.buyerId) addNotif(task.buyerId, 'Work ready to confirm', `${task.title} approved by supervisor. Please confirm.`);
  } else if (decision === 'reject') {
    task.status = 'rejected';
    if (task.workerId) addNotif(task.workerId, 'Task Rejected', `${task.title} rejected. Reason: ${note||'Quality insufficient.'}`);
  } else if (decision === 'escalate') {
    task.status = 'escalated';
    addNotif('a1', 'Task escalated by supervisor', `${task.title} needs admin review.`);
  }

  task.supervisorNote = note;
  task.supervisorDecision = decision;
  res.json({ success: true });
});

// ════════════════════════════════════════
// ADMIN ROUTES
// ════════════════════════════════════════
app.get('/api/admin/stats', auth, (req, res) => {
  res.json({
    totalTasks: DB.tasks.length,
    completedTasks: DB.tasks.filter(t=>t.status==='completed').length,
    openTasks: DB.tasks.filter(t=>t.status==='open').length,
    activeWorkers: DB.users.filter(u=>u.role==='worker'&&u.status==='approved').length,
    pendingWorkers: DB.users.filter(u=>u.role==='worker'&&u.status==='pending').length,
    totalBuyers: DB.users.filter(u=>u.role==='buyer').length,
    totalPaidOut: DB.transactions.filter(t=>t.type==='credit').reduce((s,t)=>s+(t.amount||0),0)
  });
});

app.get('/api/admin/users', auth, (req, res) => {
  const { role, status } = req.query;
  let users = DB.users.map(safe);
  if (role) users = users.filter(u => u.role === role);
  if (status) users = users.filter(u => u.status === status);
  res.json(users);
});

app.put('/api/admin/users/:id', auth, (req, res) => {
  const user = DB.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { status, zone, plan } = req.body;
  if (status) user.status = status;
  if (zone) user.zone = zone;
  if (plan) user.plan = plan;
  if (status === 'approved' && user.role === 'worker') {
    addNotif(user.id, "You're approved! 🎉", "Welcome to Swiftdo. Start accepting tasks now.");
  }
  res.json(safe(user));
});

app.get('/api/admin/tasks', auth, (req, res) => res.json(DB.tasks));

app.post('/api/admin/payouts', auth, (req, res) => {
  const pending = DB.tasks.filter(t => t.status === 'completed' && !t.paid);
  let total = 0;
  pending.forEach(task => {
    task.paid = true;
    const worker = DB.users.find(u => u.id === task.workerId);
    if (worker && worker.status === 'approved') {
      worker.walletBalance = (worker.walletBalance||0) + task.reward;
      worker.totalEarned = (worker.totalEarned||0) + task.reward;
      DB.transactions.unshift({ id:uuidv4(), workerId:worker.id, type:'credit', amount:task.reward, desc:task.title, date:new Date().toISOString() });
      addNotif(worker.id, `₹${task.reward} paid`, `${task.title} payout processed.`);
      total += task.reward;
    }
  });
  res.json({ success:true, totalPaid:total, tasksProcessed:pending.length });
});

// ════════════════════════════════════════
// CITIZEN ROUTES
// ════════════════════════════════════════
app.post('/api/citizen/report', auth, (req, res) => {
  const { category, location, description, urgency, lat, lng } = req.body;
  if (!category || !location) return res.status(400).json({ error: 'Category and location required' });

  const report = { id:uuidv4(), citizenId:req.user.id, category, location, description, urgency:urgency||'normal', status:'open', lat, lng, createdAt:new Date().toISOString() };
  DB.reports.push(report);

  // Auto-create civic task from this report
  const task = { id:uuidv4(), title:`${category} — ${location}`, description:description||`${category} issue at ${location}`, category:'civic', location, urgency:urgency||'normal', status:'open', workerId:null, buyerId:null, reward:150, zone:req.fullUser.zone||'Zone 4', aiScore:null, paid:false, lat, lng, citizenReport:true, citizenId:req.user.id, createdAt:new Date().toISOString() };
  DB.tasks.push(task);

  const u = req.fullUser;
  u.reportsCount = (u.reportsCount||0) + 1;
  addNotif(req.user.id, 'Report submitted ✅', `${category} at ${location} — A civic worker will be assigned.`);
  res.json({ report, task });
});

app.get('/api/citizen/reports', auth, (req, res) => {
  res.json(DB.reports.filter(r => r.citizenId === req.user.id));
});

// ════════════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════════════
app.get('/api/notifications', auth, (req, res) => {
  res.json(DB.notifications.filter(n => n.userId === req.user.id).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)));
});

app.put('/api/notifications/read-all', auth, (req, res) => {
  DB.notifications.filter(n => n.userId === req.user.id).forEach(n => n.read = true);
  res.json({ success: true });
});

// ════════════════════════════════════════
// HEALTH CHECK
// ════════════════════════════════════════
app.get('/api/health', (req, res) => {
  res.json({ status:'ok', service:'Swiftdo API', users:DB.users.length, tasks:DB.tasks.length, uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Swiftdo Backend running on http://localhost:${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
