/* =========================================
   1. الإعدادات والمتغيرات العامة
   ========================================= */
const SUPABASE_URL = "https://dkrtiuelioyshbjoocqm.supabase.co";
const SUPABASE_KEY = "sb_publishable_ts5SGrWhODsG6EH5dUt9Wg_KUvsf-CF";

const HALLS = ["1","2","3","4","5"];
const SHIFTS = ["أ","ب","ج","د"];
const HALL_TYPES = { arrival: "قدوم", departure: "مغادرة" };
const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

const RANK_ORDER = {
    "رئيس رقباء": 1, "رقيب أول": 2, "رقيب": 3, "وكيل رقيب": 4, "عريف": 5, "جندي أول": 6, "جندي": 7
};

// تعريف الحالات
const STATUSES = {
  early:    { label:"حضور مبكر", color:"#10b981", type:'good' },
  normal:   { label:"حضور عادي", color:"#3b82f6", type:'neutral' },
  late:     { label:"متأخر",     color:"#f59e0b", type:'bad' },
  rest:     { label:"راحة",      color:"#64748b", type:'neutral' },
  absent:   { label:"غياب",      color:"#ef4444", type:'bad' },
  assignment: { label:"تكليف",   color:"#10b981", type:'good' }, 
  course:   { label:"دورة",      color:"#8b5cf6", type:'neutral' },
  vacation: { label:"إجازة",     color:"#64748b", type:'neutral' },
  newborn:  { label:"رعاية مولود",color:"#d946ef", type:'neutral' },
  death:    { label:"حالة وفاة", color:"#94a3b8", type:'neutral' },
  detained: { label:"موقوف",     color:"#ef4444", type:'bad' },
  app:      { label:"تطبيق",     color:"#fbbf24", type:'bad' },
  absent_excused: { label:"غياب بعذر", color:"#fcd34d", type:'neutral' }, 
  excused:  { label:"استئذان",   color:"#8b5cf6", type:'neutral' },
  other:    { label:"غير ذلك",   color:"#e2e8f0", type:'neutral' }
};

const STATUS_ORDER = ['early', 'normal', 'late', 'rest', 'absent', 'assignment', 'course', 'vacation', 'absent_excused', 'newborn', 'death', 'detained', 'app', 'excused', 'other'];

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let sessionUser = null;
let employees = [];
let dailyPool = [], chosen = [];
let curStatus = "normal";
let isViolation = false; 
let selectedSickEmpId = null;
let isAdmin = false;

const $ = (id) => document.getElementById(id);
const today = () => new Date().toISOString().split('T')[0];

function toHijri(dateStr) {
    if(!dateStr) return "-";
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        day: 'numeric', month: 'long', year: 'numeric' 
    }).format(date);
}

/* =========================================
   2. التهيئة
   ========================================= */
window.onload = async () => {
  if($('d_date')) $('d_date').value = today();
  if($('st_to')) $('st_to').value = today();
  
  const d = new Date();
  d.setDate(d.getDate() - 30);
  if($('st_from')) $('st_from').value = d.toISOString().split('T')[0];

  if($('dateNow')) $('dateNow').textContent = toHijri(new Date());
  
  // تعبئة القوائم المنسدلة
  const hallSelects = ['d_hall', 'm_hall_filter', 'm_new_hall', 'st_hall', 'rec_hall', 'add_hall'];
  hallSelects.forEach(id => { if($(id)) fillSelect(id, HALLS, true) });
  
  const shiftSelects = ['d_shift', 'm_shift_filter', 'm_new_shift', 'st_shift', 'rec_shift', 'add_shift'];
  shiftSelects.forEach(id => { if($(id)) fillSelect(id, SHIFTS, true) });
  
  const typeSelects = ['d_type', 'm_type_filter', 'm_new_type', 'st_type', 'rec_type', 'add_type'];
  typeSelects.forEach(id => {
      const el = $(id); 
      if(el) {
          el.innerHTML = '<option value="">الكل</option><option value="departure" selected>مغادرة</option><option value="arrival">قدوم</option>';
          el.value = 'departure'; 
      }
  });

  const mSel = $('m_month');
  const eSel = $('e_month');
  if(mSel && eSel) {
      MONTHS.forEach((m,i) => {
          mSel.innerHTML += `<option value="${i+1}">${m}</option>`;
          eSel.innerHTML += `<option value="${i+1}">${m}</option>`;
      });
      mSel.value = eSel.value = new Date().getMonth() + 1;
  }

  const radioDiv = $('statusRadios');
  if(radioDiv) {
      STATUS_ORDER.forEach(k => {
        const v = STATUSES[k];
        const lbl = document.createElement('label');
        lbl.className = 'radio-label';
        lbl.setAttribute('data-type', v.type);
        lbl.innerHTML = `<input type="radio" name="st" value="${k}" ${k==='normal'?'checked':''} onchange="changeStatus(this.value)">${v.label}`;
        radioDiv.appendChild(lbl);
      });
  }

  initDatePickers();
  checkAuth();
};

function fillSelect(id, arr, hasAll=false){
  const el = $(id); if(!el) return;
  el.innerHTML = hasAll ? '<option value="">الكل</option>' : '';
  arr.forEach(x => el.innerHTML += `<option value="${x}">${x}</option>`);
  if(!hasAll && el.options.length) el.selectedIndex = 0;
}

function initDatePickers() {
    document.querySelectorAll('.date-hijri-picker').forEach(input => {
        input.addEventListener('change', (e) => {
            const spanId = e.target.id + '_hijri';
            const span = $(spanId);
            if(span) span.textContent = "📅 الموافق: " + toHijri(e.target.value);
        });
        if(input.value) {
             const spanId = input.id + '_hijri';
             const span = $(spanId);
             if(span) span.textContent = "📅 الموافق: " + toHijri(input.value);
        }
    });
}

async function checkAuth(){
  const {data} = await sb.auth.getSession();
  sessionUser = data.session?.user;
  
  if(sessionUser){
    if($('authScreen')) $('authScreen').classList.add('hidden');
    const meta = sessionUser.user_metadata || {};
    const disp = meta.display_name || meta.name || meta.full_name || sessionUser.email.split('@')[0];
    
    if($('userDisplayName')) $('userDisplayName').innerHTML = `<div style="font-weight:bold; font-size:14px; margin-bottom:5px">مرحباً، ${disp}</div>`;

    // تعبئة الفلاتر الافتراضية بناءً على بيانات المستخدم
    if(meta.hall) {
        ['d_hall', 'st_hall', 'rec_hall'].forEach(id => { if($(id)) $(id).value = meta.hall; });
    }
    if(meta.shift) {
        ['d_shift', 'st_shift', 'rec_shift'].forEach(id => { if($(id)) $(id).value = meta.shift; });
    }

    await checkPermissions();
    // تحميل الموظفين وتعبئة القوائم
    await loadEmployees(); 
  } else {
    if($('authScreen')) $('authScreen').classList.remove('hidden');
  }
}

async function checkPermissions() {
    if (sessionUser.email === 'shift-management@test.com') {
        isAdmin = true;
        if($('userDisplayName')) $('userDisplayName').innerHTML += ' <span style="color:#10b981; font-size:11px; display:block">● الصلاحيات: مدير (كاملة)</span>';
        if($('nav-requests')) $('nav-requests').classList.remove('hidden');
        checkNotifications();
        return; 
    }

    const { data } = await sb.from('allowed_users').select('email').eq('email', sessionUser.email).single();
    
    if (data) {
        isAdmin = true;
        if($('userDisplayName')) $('userDisplayName').innerHTML += ' <span style="color:#10b981; font-size:11px; display:block">● الصلاحيات: مدير (كاملة)</span>';
        if($('nav-requests')) $('nav-requests').classList.remove('hidden');
        checkNotifications();
    } else {
        isAdmin = false;
        if($('userDisplayName')) $('userDisplayName').innerHTML += ' <span style="color:#f59e0b; font-size:11px; display:block">● الصلاحيات: مشاهدة فقط</span>';
        disableEditingUI();
    }
}

function disableEditingUI() {
    const btns = document.querySelectorAll('button.btn-primary, button.btn-danger');
    btns.forEach(btn => {
        const txt = btn.textContent;
        if (['حفظ', 'نقل', 'تحديث', 'إنشاء', 'قبول', 'إضافة', 'خدماتي', 'تثبيت', 'رفض', 'حذف'].some(k => txt.includes(k))) {
            if(btn.closest('.auth-box')) return; 
            btn.disabled = true; btn.style.opacity = '0.5'; btn.style.cursor = 'not-allowed'; 
            if(!btn.innerHTML.includes('🔒')) btn.innerHTML = '🔒 ' + txt;
        }
    });
    if($('otherInputDiv')) $('otherInputDiv').classList.add('hidden');
}

async function signIn(){
  const { data, error } = await sb.auth.signInWithPassword({
    email: $('email').value, password: $('password').value
  });
  if(error) { $('authMsg').textContent = error.message; } 
  else {
      const { data: empData } = await sb.from('employees').select('is_approved').eq('id', data.user.id).single();
      if(data.user.email === 'shift-management@test.com' || (empData && empData.is_approved)) { checkAuth(); } 
      else { await sb.auth.signOut(); $('authMsg').innerHTML = `<span style="color:#ef4444">⛔ بانتظار تفعيل الحساب.</span>`; }
  }
}

async function signUp(){
    const email = $('reg_email').value; const pass = $('reg_pass').value;
    const rank = $('reg_rank').value; const name = $('reg_name').value;
    
    if(!email || !pass || !name) { $('regMsg').textContent = "البيانات ناقصة"; return; }

    const { data: authData, error: authError } = await sb.auth.signUp({
      email: email, password: pass, options: { data: { display_name: `${rank} ${name}` } }
    });

    if(authError) { $('regMsg').textContent = authError.message; return; }

    if(authData.user) {
        const { error: dbError } = await sb.from('employees').insert({
            id: authData.user.id, name: name, rank: rank,
            hall: $('reg_hall').value, shift: $('reg_shift').value, hall_type: $('reg_type').value,
            email: email, is_approved: false 
        });
        if(dbError) { $('regMsg').textContent = "خطأ: " + dbError.message; } 
        else { await sb.auth.signOut(); alert('✅ تم الإرسال'); toggleAuthMode(); }
    }
}

async function logout(){ await sb.auth.signOut(); location.reload(); }
function toggleAuthMode() {
    const login = $('loginForm'); const reg = $('registerForm');
    login.classList.toggle('hidden'); reg.classList.toggle('hidden');
}

/* =========================================
   3. الملاحة والقائمة الجانبية
   ========================================= */
function toggleSidebar() {
    const sb = document.getElementById('mainSidebar');
    const ov = document.getElementById('mobileOverlay');
    sb.classList.toggle('active');
    ov.classList.toggle('active');
}

function go(pg){
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  $('sec-'+pg).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if($('nav-'+pg)) $('nav-'+pg).classList.add('active');
  if($('pageTitle')) $('pageTitle').textContent = $(`nav-${pg}`).textContent.trim();
  if(window.innerWidth <= 768) { const sb = document.getElementById('mainSidebar'); if(sb.classList.contains('active')) toggleSidebar(); }
  
  if(pg === 'requests' && isAdmin) loadRequests();
  if(pg === 'stats') loadGeneralStats();
  if(pg === 'absence') { loadAbsenceSection(); loadAbsenceLog(); }
}

/* =========================================
   4. قسم الغياب (المعدل)
   ========================================= */
async function loadAbsenceSection() {
    const list = $('absentEmployeesList');
    list.innerHTML = 'جاري التحميل...';
    
    const { data: absEvents } = await sb.from('events')
      .select('id, event_date, employee_id, employees!inner(id, name, rank, hall, shift)')
      .eq('status', 'absent')
      .is('note', null) 
      .order('event_date', {ascending: false});

    if(!absEvents || absEvents.length === 0) {
        list.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted)">لا يوجد غياب معلق (الكل معالج) ✅</div>';
        return;
    }

    const grouped = {};
    absEvents.forEach(ev => {
        if(!grouped[ev.employee_id]) grouped[ev.employee_id] = { ...ev.employees, events: [] };
        grouped[ev.employee_id].events.push(ev);
    });

    list.innerHTML = '';
    Object.values(grouped).forEach(emp => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
          <div><span style="font-weight:bold">${emp.rank} ${emp.name}</span>
          <span style="font-size:11px; color:var(--text-muted); display:block">${emp.hall}-${emp.shift} | معلق: <b style="color:var(--danger)">${emp.events.length}</b></span></div>
          <button class="btn-secondary" style="width:auto; font-size:11px; margin:0" onclick="showAbsenceDetails('${emp.id}')">عرض</button>
        `;
        list.appendChild(div);
    });
    window.tempAbsData = grouped;
}

function showAbsenceDetails(empId) {
    const emp = window.tempAbsData[empId];
    if(!emp) return;
    selectedSickEmpId = empId;
    $('sickActionPanel').classList.remove('hidden');
    $('sickPlaceholder').classList.add('hidden');
    $('sickTargetName').textContent = `${emp.rank} ${emp.name}`;
    $('sickTargetInfo').textContent = `الصالة: ${emp.hall} | المناوبة: ${emp.shift}`;
    const sel = $('sickDateSelect'); sel.innerHTML = '';
    emp.events.forEach(ev => { sel.innerHTML += `<option value="${ev.id}">${toHijri(ev.event_date)} (${ev.event_date})</option>`; });
}

async function markAsExcused() {
    if(!isAdmin) { alert('صلاحيات المدير مطلوبة'); return; }
    const eventId = $('sickDateSelect').value; if(!eventId) return alert('اختر التاريخ');
    if(!confirm('سيتم التحويل لغياب بعذر. هل أنت متأكد؟')) return;
    const { error } = await sb.from('events').update({ status: 'absent_excused', note: 'تم الرفع بخدماتي والتاكد منه' }).eq('id', eventId);
    if(error) alert(error.message); else { alert('✅ تم التحديث'); refreshAbsenceView(); }
}

async function markAsUnexcused() {
    if(!isAdmin) { alert('صلاحيات المدير مطلوبة'); return; }
    const eventId = $('sickDateSelect').value; if(!eventId) return alert('اختر التاريخ');
    if(!confirm('سيتم تثبيت الغياب بدون عذر. هل أنت متأكد؟')) return;
    const { error } = await sb.from('events').update({ note: 'غياب بدون عذر' }).eq('id', eventId);
    if(error) alert(error.message); else { alert('❌ تم التثبيت'); refreshAbsenceView(); }
}

function refreshAbsenceView() {
    $('sickActionPanel').classList.add('hidden');
    $('sickPlaceholder').classList.remove('hidden');
    loadAbsenceSection(); loadAbsenceLog();
}

async function loadAbsenceLog() {
    const tb = $('sickLogBody'); tb.innerHTML = '<tr><td colspan="5" style="text-align:center">جاري التحميل...</td></tr>';
    const { data: logs } = await sb.from('events').select('id, event_date, status, note, employees!inner(name)').neq('note', null).in('status', ['absent', 'absent_excused']).order('event_date', {ascending: false}).limit(20);
    tb.innerHTML = '';
    if(!logs || logs.length === 0) { tb.innerHTML = '<tr><td colspan="5" style="text-align:center">لا يوجد سجلات</td></tr>'; return; }
    logs.forEach(log => {
        tb.innerHTML += `<tr><td>${log.employees.name}</td><td>${toHijri(log.event_date)}</td>
        <td><span style="color:${STATUSES[log.status]?.color}">${STATUSES[log.status]?.label}</span></td><td>${log.note}</td>
        <td><button class="delete-btn-sm" onclick="revertAbsenceStatus('${log.id}')">↩️</button></td></tr>`;
    });
}

async function revertAbsenceStatus(id) {
    if(!confirm('إلغاء الإجراء وإعادته للقائمة؟')) return;
    const { error } = await sb.from('events').update({ status: 'absent', note: null }).eq('id', id);
    if(error) alert(error.message); else { loadAbsenceLog(); loadAbsenceSection(); }
}

/* =========================================
   5. إدارة الموظفين والبيانات الأساسية
   ========================================= */
async function loadEmployees(){
  const {data} = await sb.from('employees').select('*').eq('is_approved', true).is('email', null); 
  
  if(data) {
      employees = data.sort((a,b) => (RANK_ORDER[a.rank]||99) - (RANK_ORDER[b.rank]||99));
  } else {
      employees = [];
  }

  // استدعاء جميع الفلاتر لتعبئة القوائم المنسدلة فوراً
  loadDailyData(); 
  filterRecSelect(); 
  filterEditSelect(); 
  filterMoveSelect();  
  filterDeleteSelect(); 
}

/* =========================================
   6. الحضور اليومي
   ========================================= */
function changeStatus(val) {
    curStatus = val;
    $('otherInputDiv').classList.add('hidden'); $('appInputDiv').classList.add('hidden');
    if(val === 'other') $('otherInputDiv').classList.remove('hidden');
    else if (val === 'app') $('appInputDiv').classList.remove('hidden');
}

function setViolation(isBad, el) {
    isViolation = isBad;
    document.querySelectorAll('.v-option').forEach(d => d.classList.remove('active'));
    el.classList.add('active');
}

function loadDailyData(){
  const h = $('d_hall').value; const s = $('d_shift').value; const t = $('d_type').value; 
  $('submitted-area').classList.add('hidden');
  if (!h || !s || !t) { dailyPool = []; chosen = []; renderDaily(); return; }
  dailyPool = employees.filter(e => (e.hall == h) && (e.shift == s) && (e.hall_type == t));
  chosen = []; renderDaily();
}

function renderDaily(){
  const p = $('list-pool'), c = $('list-chosen'); p.innerHTML = ''; c.innerHTML = '';
  const chIds = chosen.map(x=>x.id); const avail = dailyPool.filter(x => !chIds.includes(x.id));
  $('c-pool').textContent = avail.length; $('c-chosen').textContent = chosen.length;

  avail.forEach(e => {
    const d = document.createElement('div'); d.className = 'list-item';
    d.innerHTML = `<span>${e.name}</span> <span class="emp-meta">${e.rank||''}</span>`;
    d.onclick = () => { 
        let note = "";
        if (curStatus === 'other') { note = isViolation ? `[مخالفة] ${$('status_manual_text').value}` : $('status_manual_text').value; }
        else if (curStatus === 'app') { note = $('app_reason_text').value; }
        chosen.push({...e, st:curStatus, manualNote: note}); renderDaily(); 
    };
    p.appendChild(d);
  });

  chosen.forEach((e, idx) => {
    const def = STATUSES[e.st];
    const d = document.createElement('div'); d.className = 'list-item selected';
    d.style.borderColor = def.color; d.style.backgroundColor = `${def.color}15`; 
    d.innerHTML = `<div style="width:100%"><div style="display:flex; justify-content:space-between"><span>${e.name}</span><small style="color:${def.color}">${def.label}</small></div>${e.manualNote ? `<small style="display:block;opacity:0.7">${e.manualNote}</small>`:''}</div>`;
    d.onclick = () => { chosen.splice(idx,1); renderDaily(); };
    c.appendChild(d);
  });
}

function moveAll(){
  const chIds = chosen.map(x=>x.id);
  let note = (curStatus === 'other') ? ($('status_manual_text').value) : (curStatus === 'app' ? $('app_reason_text').value : "");
  if(curStatus === 'other' && isViolation) note = "[مخالفة] " + note;
  dailyPool.filter(x => !chIds.includes(x.id)).forEach(e => chosen.push({...e, st:curStatus, manualNote: note}));
  renderDaily();
}

function clearChosen(){ chosen=[]; renderDaily(); }

async function submitDaily(){
  if (!isAdmin) { alert('⛔ عذراً، هذا الحساب للصلاحيات "مشاهدة فقط".'); return; }
  if(!chosen.length) return alert('القائمة فارغة');
  $('dailyMsg').textContent = 'جاري التحقق والحفظ...';
  
  const finalInserts = chosen.map(c => ({
      event_date: $('d_date').value, hall: $('d_hall').value, shift: $('d_shift').value, hall_type: $('d_type').value,
      employee_id: c.id, status: c.st, note: c.manualNote || null, created_by: sessionUser.id
  }));

  const {error} = await sb.from('events').insert(finalInserts);
  if(error) { $('dailyMsg').textContent = 'حدث خطأ: ' + error.message; } 
  else { $('dailyMsg').textContent = 'تم الحفظ بنجاح ✅'; chosen=[]; renderDaily(); $('status_manual_text').value=''; $('app_reason_text').value=''; if(!$('submitted-area').classList.contains('hidden')) loadSubmittedToday(); }
}

async function toggleSubmittedList() {
    const area = $('submitted-area');
    area.classList.toggle('hidden');
    if (!area.classList.contains('hidden')) await loadSubmittedToday();
}

async function loadSubmittedToday() {
    const listDiv = $('submitted-list'); listDiv.innerHTML = 'جاري البحث...';
    const { data: evs } = await sb.from('events').select('id, status, note, employees!inner(name, rank)').eq('event_date', $('d_date').value).eq('hall', $('d_hall').value).eq('shift', $('d_shift').value);
    
    if(!evs || !evs.length) { listDiv.innerHTML = 'لا يوجد أسماء'; $('sub-count').textContent = 0; return; }
    listDiv.innerHTML = ''; $('sub-count').textContent = evs.length;

    evs.forEach(ev => {
        const stDef = STATUSES[ev.status] || STATUSES.normal;
        const noteTxt = ev.note ? ` - <span style="opacity:0.8">(${ev.note})</span>` : '';
        const btn = isAdmin ? `<button class="btn-danger" style="padding:4px 8px; font-size:10px; width:auto; margin:0" onclick="deleteEvent('${ev.id}')">حذف/تعديل</button>` : '';
        listDiv.innerHTML += `<div class="submitted-item"><div><span style="font-weight:bold; margin-left:5px">${ev.employees.name}</span><span style="color:${stDef.color}; font-size:11px; font-weight:bold">${stDef.label} ${noteTxt}</span></div>${btn}</div>`;
    });
}

async function deleteEvent(eventId) {
    if(!confirm('هل تريد حذف هذا التحضير؟')) return;
    const { error } = await sb.from('events').delete().eq('id', eventId);
    if(error) alert(error.message); else { loadSubmittedToday(); loadAbsenceLog(); alert('تم الحذف.'); }
}

async function deleteEventFromHistory(eventId) {
    if (!isAdmin) { alert('صلاحيات المدير مطلوبة'); return; }
    if(!confirm('هل أنت متأكد من حذف هذا السجل نهائياً؟')) return;
    const { error } = await sb.from('events').delete().eq('id', eventId);
    if(error) alert(error.message); else { alert('تم الحذف بنجاح'); loadSoldierRecord(); }
}

/* =========================================
   8. إنتاجية المسافرين
   ========================================= */
async function loadMonthlyEntry(){
  const y = $('m_year').value, m = $('m_month').value;
  const h = $('m_hall_filter').value;
  const s = $('m_shift_filter').value;
  const t = $('m_type_filter').value;

  const targetEmps = employees.filter(e => (!h || e.hall == h) && (!s || e.shift == s) && (!t || e.hall_type == t));
  const {data: stats} = await sb.from('monthly_stats').select('*').eq('year', y).eq('month', m);
  const statMap = {}; if(stats) stats.forEach(x => statMap[x.employee_id] = x.score);

  const tb = $('monthlyBody'); tb.innerHTML = '';
  targetEmps.forEach(e => {
    const val = statMap[e.id] !== undefined ? statMap[e.id] : '';
    tb.innerHTML += `<tr><td>${e.name}</td><td>${e.rank}</td><td style="opacity:0.7">${val}</td><td><input type="number" class="score-input" value="${val}" id="sc_${e.id}"></td></tr>`;
  });
}

async function submitMonthlyScores(){
  if (!isAdmin) { alert('⛔ عذراً، الحساب للمشاهدة فقط.'); return; }
  const y = $('m_year').value, m = $('m_month').value;
  const inputs = document.querySelectorAll('input[id^="sc_"]');
  const updates = [];
  inputs.forEach(inp => {
      const eid = inp.id.split('_')[1];
      if(inp.value !== '') updates.push({ employee_id: eid, year: y, month: m, score: parseInt(inp.value) });
  });

  if(!updates.length) return;
  $('saveStatusSpan').style.opacity = '1';
  const {error} = await sb.from('monthly_stats').upsert(updates, {onConflict:'employee_id,year,month'});
  if(error) alert('حدث خطأ: ' + error.message); else alert('تم حفظ الأرقام بنجاح ✅');
  setTimeout(() => { $('saveStatusSpan').style.opacity = '0'; }, 3000);
}

/* =========================================
   9. سجل الفرد والملف الشخصي - (تم إصلاح الفلاتر)
   ========================================= */
function filterRecSelect(){
   // تم استرجاع منطق الفلترة الكامل (صالة، مناوبة، نوع، اسم)
   const h = $('rec_hall') ? $('rec_hall').value : '';
   const s = $('rec_shift') ? $('rec_shift').value : '';
   const t = $('rec_type') ? $('rec_type').value : '';
   const txt = $('rec_search_text') ? $('rec_search_text').value.toLowerCase() : '';
   
   const el = $('rec_emp_select');
   if(!el) return;
   el.innerHTML = '';
   
   let filtered = employees.filter(e => 
      (!h || e.hall == h) && 
      (!s || e.shift == s) &&
      (!t || e.hall_type == t) &&
      (!txt || e.name.toLowerCase().includes(txt))
   );

   if(filtered.length === 0) {
       el.innerHTML = '<option value="">لا يوجد نتائج</option>';
   } else {
       filtered.forEach(e => {
           el.innerHTML += `<option value="${e.id}">${e.name} (${e.hall}-${e.shift})</option>`;
       });
       el.selectedIndex = 0;
   }
}

function calculateScore(status, note) {
    if (status === 'other' && note && note.includes('[مخالفة]')) return -10;
    if(status === 'early') return 10;
    if(status === 'normal') return 8; 
    if(status === 'late') return 1;   
    if(status === 'app' || status === 'detained') return -10;
    if(status === 'absent') return -20; 
    if(status === 'absent_excused') return -4; 
    if(STATUSES[status]?.type === 'neutral') return null;
    return 0; 
}

async function updateEventStatus(id, newStatus, reason) {
    if(!confirm('هل أنت متأكد من تبرير هذا الغياب؟')) return;
    const { error } = await sb.from('events')
        .update({ status: 'absent_excused', note: reason })
        .eq('id', id);
    
    if(error) alert('خطأ: ' + error.message);
    else {
        alert('تم التعديل بنجاح ✅');
        loadSoldierRecord(); 
    }
}

async function loadSoldierRecord(){
  const id = $('rec_emp_select').value;
  if(!id) return alert('الرجاء اختيار الفرد');
  const emp = employees.find(e => e.id == id);
  
  $('soldier-profile').classList.remove('hidden');
  $('p_name').textContent = emp.name;
  $('p_rank').textContent = emp.rank;
  $('p_loc').textContent = `${emp.hall}-${emp.shift}`;
  
  const {data: evs} = await sb.from('events').select('*').eq('employee_id', emp.id).order('event_date', {ascending:false}).limit(100);
  const tb = $('p_history'); tb.innerHTML = '';
  
  let cAbsent=0, cLate=0, cEarly=0, cExcused=0, cVio=0, cAbsentExcused=0;
  let totalPoints = 0, countedDays = 0;

  if(evs) {
      evs.forEach(ev => {
          const stDef = STATUSES[ev.status] || STATUSES.normal;
          if(ev.status === 'absent') cAbsent++;
          if(ev.status === 'late') cLate++;
          if(ev.status === 'early') cEarly++;
          if(ev.status === 'excused') cExcused++;
          if(ev.status === 'absent_excused') cAbsentExcused++; 
          if(stDef.type === 'bad' || (ev.note && ev.note.includes('[مخالفة]'))) cVio++;
          
          const pts = calculateScore(ev.status, ev.note);
          if (pts !== null) { totalPoints += pts; countedDays++; }

          let noteTxt = ev.note || '-';
          let actionHtml = '';
          if(ev.status === 'absent') actionHtml += `<button class="excuse-btn" onclick="updateEventStatus('${ev.id}','absent_excused', prompt('السبب'))">تبرير</button>`;
          if(isAdmin) actionHtml += `<button class="delete-btn-sm" onclick="deleteEventFromHistory('${ev.id}')">🗑️</button>`;

          tb.innerHTML += `<tr><td>${toHijri(ev.event_date)}</td><td><span style="color:${stDef.color}; font-weight:bold">${stDef.label}</span></td>
          <td><div style="display:flex; justify-content:space-between"><span>${noteTxt}</span><div>${actionHtml}</div></div></td></tr>`;
      });
  }

  // تحديث الإحصائيات (أفقي)
  if($('p_count_absent')) $('p_count_absent').textContent = cAbsent;
  if($('p_count_late')) $('p_count_late').textContent = cLate;
  if($('p_count_early')) $('p_count_early').textContent = cEarly;
  if($('p_count_vio')) $('p_count_vio').textContent = cVio;
  if($('p_count_absent_excused')) $('p_count_absent_excused').textContent = cAbsentExcused;

  // تحديث الدائرة
  const totalEvents = cAbsent + cAbsentExcused + cLate + cEarly + cExcused;
  const doughnut = $('p_doughnut');
  const legend = $('p_doughnut_legend');
  if($('p_total_events')) $('p_total_events').textContent = totalEvents;
  
  if(doughnut && legend) {
      if(totalEvents > 0) {
          const pAbsent = (cAbsent / totalEvents) * 100;
          const pAbsentEx = (cAbsentExcused / totalEvents) * 100;
          const pLate = (cLate / totalEvents) * 100;
          const pEarly = (cEarly / totalEvents) * 100;
          const pExcused = (cExcused / totalEvents) * 100;

          let currentDeg = 0;
          const colors = [];
          const addSeg = (pct, color) => {
              if(pct > 0) {
                  colors.push(`${color} ${currentDeg}% ${currentDeg + pct}%`);
                  currentDeg += pct;
              }
          };

          addSeg(pAbsent, STATUSES.absent.color);
          addSeg(pAbsentEx, STATUSES.absent_excused.color);
          addSeg(pLate, STATUSES.late.color);
          addSeg(pEarly, STATUSES.early.color);
          addSeg(pExcused, STATUSES.excused.color);

          doughnut.style.background = `conic-gradient(${colors.join(', ')})`;

          legend.innerHTML = `
              ${cAbsent > 0 ? `<div class="d-leg-item"><div class="d-leg-info"><div class="d-leg-color" style="background:${STATUSES.absent.color}"></div>غياب</div><div class="d-leg-val">${cAbsent}</div></div>` : ''}
              ${cAbsentExcused > 0 ? `<div class="d-leg-item"><div class="d-leg-info"><div class="d-leg-color" style="background:${STATUSES.absent_excused.color}"></div>بعذر</div><div class="d-leg-val">${cAbsentExcused}</div></div>` : ''}
              ${cLate > 0 ? `<div class="d-leg-item"><div class="d-leg-info"><div class="d-leg-color" style="background:${STATUSES.late.color}"></div>تأخير</div><div class="d-leg-val">${cLate}</div></div>` : ''}
              ${cEarly > 0 ? `<div class="d-leg-item"><div class="d-leg-info"><div class="d-leg-color" style="background:${STATUSES.early.color}"></div>مبكر</div><div class="d-leg-val">${cEarly}</div></div>` : ''}
              ${cExcused > 0 ? `<div class="d-leg-item"><div class="d-leg-info"><div class="d-leg-color" style="background:${STATUSES.excused.color}"></div>استئذان</div><div class="d-leg-val">${cExcused}</div></div>` : ''}
          `;
      } else {
          doughnut.style.background = 'rgba(255,255,255,0.05)'; 
          legend.innerHTML = '<div style="text-align:center; font-size:11px; color:var(--text-muted)">لا توجد بيانات</div>';
      }
  }

  // حساب المؤشر
  let scorePercent = 0;
  let reasonText = "عادي", reasonColor = "var(--text-muted)";

  if(countedDays < 3) {
      scorePercent = 50; 
  } else {
      const maxPossible = countedDays * 10;
      scorePercent = (totalPoints / maxPossible) * 100;

      const y = new Date().getFullYear();
      const {data: stats} = await sb.from('monthly_stats').select('month,score').eq('employee_id', emp.id).eq('year', y);
      let totalProd = 0;
      if(stats) stats.forEach(s => totalProd += s.score);
      
      let boost = 0;
      if(totalProd > 2000) boost += 2;
      if(totalProd > 3000) boost += 2; 
      if(totalProd > 4000) boost += 2;
      
      scorePercent += boost;
      if(scorePercent > 100) scorePercent = 100; if(scorePercent < 0) scorePercent = 0;

      if(scorePercent < 50) { reasonText = `منخفض (${cVio} مخالفة)`; reasonColor = "var(--danger)"; }
      else if (scorePercent < 70) { reasonText = "متوسط"; reasonColor = "var(--warning)"; }
      else if (scorePercent < 90) { reasonText = "جيد"; reasonColor = "#3b82f6"; }
      else { reasonText = "مميز"; reasonColor = "var(--success)"; }
  }

  updateGauge('p', scorePercent, reasonText, reasonColor);
  
  // الرسم البياني + الإنتاجية
  const chart = $('p_chart_container'); 
  const labels = $('p_chart_labels');
  
  if(chart && labels) {
      chart.innerHTML = ''; labels.innerHTML = '';
      const y = new Date().getFullYear();
      const {data: stats} = await sb.from('monthly_stats').select('month,score').eq('employee_id', emp.id).eq('year', y);
      let totalProd = 0;
      if(stats) stats.forEach(s => totalProd += s.score);
      
      if($('p_total_prod')) $('p_total_prod').textContent = totalProd;

      let max = 0;
      if(stats) stats.forEach(s => { if(s.score > max) max = s.score; });
      MONTHS.forEach((mName, i) => {
        const idx = i+1; const rec = stats?.find(s => s.month === idx); const val = rec ? rec.score : 0;
        const h = max > 0 ? (val/max*100) : 0; const barHeight = Math.max(h, 1); 
        chart.innerHTML += `<div style="flex:1; height:100%; display:flex; flex-direction:column; justify-content:flex-end; align-items:center;">
              <span style="font-size:8px; color:var(--text-main); margin-bottom:1px; ${val>0?'':'opacity:0'}">${val}</span>
              <div style="width:100%; background:var(--productivity); height:${barHeight}%; border-radius:3px 3px 0 0; opacity:${val>0?1:0.2}; box-shadow:0 0 5px var(--productivity)"></div></div>`;
        labels.innerHTML += `<div style="flex:1; text-align:center">${idx}</div>`;
      });
  }
}

function updateGauge(prefix, percent, reason="", rColor="") {
    const arc = $(`${prefix}_gauge_arc`); const needle = $(`${prefix}_gauge_needle`); const text = $(`${prefix}_gauge_text`);
    const rDiv = $(`${prefix}_gauge_reason`); 
    if(rDiv) { rDiv.textContent = reason; rDiv.style.color = rColor; }
    let color = "#10b981"; if(percent < 50) color = "#ef4444"; else if(percent < 85) color = "#f59e0b"; 
    
    if(arc) { arc.style.strokeDasharray = `${(percent/100)*251}, 251`; arc.style.stroke = color; }
    if(needle) needle.style.transform = `rotate(${-90 + (percent * 1.8)}deg)`; 
    if(text) { text.textContent = Math.round(percent) + "%"; text.style.fill = color; }
}

/* =========================================
   10. الإحصائيات العامة (تم الإصلاح الشامل)
   ========================================= */
async function loadGeneralStats(){
  const from = $('st_from').value, to = $('st_to').value;
  const h = $('st_hall').value, s = $('st_shift').value, t = $('st_type').value;
  const curYear = new Date(from).getFullYear();
  
  // 1. جلب الإنتاجية
  let qProd = sb.from('monthly_stats').select('employee_id, score, employees!inner(name, hall, shift, hall_type, rank)').eq('year', curYear);
  if(h) qProd = qProd.eq('employees.hall', h); 
  if(s) qProd = qProd.eq('employees.shift', s);
  if(t) qProd = qProd.eq('employees.hall_type', t);

  const {data: prodData} = await qProd;
  const empProdMap = {}; let totalSysProd = 0;
  const disciplineScores = {}; const violationMap = {}; const absenceMap = {};

  if(prodData) prodData.forEach(row => {
    const eid = row.employee_id;
    if(!empProdMap[eid]) empProdMap[eid] = { name:row.employees.name, hall:row.employees.hall, shift:row.employees.shift, rank:row.employees.rank, total:0 };
    empProdMap[eid].total += row.score; 
    totalSysProd += row.score;
    
    if(!disciplineScores[eid]) disciplineScores[eid] = { ...empProdMap[eid], points: 0, days: 0, prodTotal: row.score, earlyCount: 0, vioCount: 0, lateCount: 0 };
    else disciplineScores[eid].prodTotal = row.score;
  });

  const sortedProd = Object.values(empProdMap).sort((a,b) => b.total - a.total);
  const chartDiv = $('prod_leaderboard'); 
  if(chartDiv) {
      chartDiv.innerHTML = ''; 
      const maxVal = sortedProd[0]?.total || 0;
      sortedProd.slice(0, 10).forEach((e, i) => {
         const pct = maxVal > 0 ? (e.total/maxVal*100) : 0;
         chartDiv.innerHTML += `<div class="bar-row"><div style="font-size:13px; white-space:nowrap; overflow:hidden;">${i+1}. ${e.name} <span class="emp-meta">${e.hall}-${e.shift}</span></div>
              <div class="bar-track"><div class="bar-fill rank-1" style="width:${pct}%"></div></div><div style="font-weight:bold; color:var(--productivity)">${e.total}</div></div>`;
      });
  }
  if($('g_total_prod')) $('g_total_prod').textContent = totalSysProd;

  // 2. الأحداث (Events)
  let qEv = sb.from('events').select('status, event_date, note, employees!inner(id, name, hall, shift, hall_type, rank)').gte('event_date', from).lte('event_date', to);
  if(h) qEv = qEv.eq('employees.hall', h); 
  if(s) qEv = qEv.eq('employees.shift', s);
  if(t) qEv = qEv.eq('employees.hall_type', t);

  const {data: events} = await qEv;
  const statsEvents = events || [];
  const statusCounts = {}; const hallViolations = {}; const hallAbsent = {}; const hallDiscipline = {}; 
  let totalBadEvents = 0; let grandTotalPoints = 0; let grandTotalDays = 0;
  const timelineData = {};

  statsEvents.forEach(ev => {
     statusCounts[ev.status] = (statusCounts[ev.status]||0)+1;
     const key = `صالة ${ev.employees.hall} - مناوبة ${ev.employees.shift}`;
     const type = STATUSES[ev.status]?.type || 'neutral';
     
     if(!timelineData[ev.event_date]) timelineData[ev.event_date] = { good: 0, bad: 0, total: 0 };
     timelineData[ev.event_date].total++;
     if(type === 'good' || ev.status === 'normal') timelineData[ev.event_date].good++;
     if(type === 'bad') timelineData[ev.event_date].bad++;

     const eid = ev.employees.id;
     if(!disciplineScores[eid]) disciplineScores[eid] = { name:ev.employees.name, hall:ev.employees.hall, shift:ev.employees.shift, rank:ev.employees.rank, points: 0, days: 0, prodTotal: 0, earlyCount: 0, vioCount: 0, lateCount: 0 };
     if(!violationMap[eid]) violationMap[eid] = { name:ev.employees.name, hall:ev.employees.hall, shift:ev.employees.shift, rank:ev.employees.rank, count: 0 };
     if(!absenceMap[eid]) absenceMap[eid] = { name:ev.employees.name, hall:ev.employees.hall, shift:ev.employees.shift, rank:ev.employees.rank, count: 0 };

     const pts = calculateScore(ev.status, ev.note);
     if (pts !== null) { disciplineScores[eid].points += pts; disciplineScores[eid].days++; grandTotalPoints += pts; grandTotalDays++; }

     if(ev.status === 'early') disciplineScores[eid].earlyCount++;
     if(ev.status === 'late') disciplineScores[eid].lateCount++;
     if(ev.status === 'absent') absenceMap[eid].count++;
     
     const isFlagged = (ev.status === 'other' && ev.note && ev.note.includes('[مخالفة]'));
     if(type === 'bad' || isFlagged) {
         disciplineScores[eid].vioCount++; violationMap[eid].count++; totalBadEvents++; hallViolations[key] = (hallViolations[key]||0)+1; 
     }
     if(type === 'good' || ev.status === 'normal') hallDiscipline[key] = (hallDiscipline[key]||0)+1;
     if(ev.status === 'early') hallDiscipline[key] = (hallDiscipline[key]||0)+2;
     if(ev.status === 'absent') hallAbsent[key] = (hallAbsent[key]||0)+1;
  });

  const rawDiscList = Object.values(disciplineScores).map(e => {
      const prodScore = (e.prodTotal || 0) / 20; 
      let rawScore = (e.days * 5) + (e.earlyCount * 15) + prodScore - (e.vioCount * 100) - (e.lateCount * 20);
      if(rawScore < 0) rawScore = 0;
      return { ...e, rawScore };
  });
  let maxRaw = 0; rawDiscList.forEach(e => { if(e.rawScore > maxRaw) maxRaw = e.rawScore; });
  const disciplineList = rawDiscList.map(e => ({ ...e, finalScore: maxRaw > 0 ? (e.rawScore / maxRaw * 100) : 0 })).sort((a,b) => b.finalScore - a.finalScore);

  const discChartDiv = $('discipline_leaderboard'); 
  if(discChartDiv) {
      discChartDiv.innerHTML = ''; 
      disciplineList.slice(0, 5).forEach((e, i) => {
         let prodText = e.prodTotal > 3000 ? "عالية" : (e.prodTotal >= 1000 ? "جيدة" : "منخفضة");
         let details = []; if(e.earlyCount > 0) details.push(`مبكر: ${e.earlyCount}`); details.push(`إنتاجية: ${prodText}`); if(e.vioCount > 0) details.push(`مخالفات: ${e.vioCount}`);
         discChartDiv.innerHTML += `<div class="bar-row"><div style="font-size:12px; line-height:1.2; overflow:hidden;"><div style="font-weight:bold">${i+1}. ${e.name}</div><div style="font-size:10px; color:var(--text-muted)">${e.rank} | ${e.hall}-${e.shift}</div><span class="discipline-detail-text">${details.join(' - ')}</span></div><div class="bar-track"><div class="bar-fill" style="width:${e.finalScore}%; background:var(--success)"></div></div><div style="font-weight:bold; color:var(--success); font-size:12px">${Math.round(e.finalScore)}%</div></div>`;
      });
  }

  const violationList = Object.values(violationMap).sort((a,b) => b.count - a.count);
  const vioChartDiv = $('violations_leaderboard');
  if(vioChartDiv) {
      vioChartDiv.innerHTML = '';
      const maxVioVal = violationList[0]?.count || 0;
      violationList.slice(0, 5).forEach((e, i) => {
          if(e.count === 0) return;
          const pct = (maxVioVal > 0) ? (e.count/maxVioVal*100) : 0;
          vioChartDiv.innerHTML += `<div class="bar-row"><div style="font-size:12px; line-height:1.2; overflow:hidden;"><div style="font-weight:bold">${i+1}. ${e.name}</div></div><div class="bar-track"><div class="bar-fill" style="width:${pct}%; background:var(--danger)"></div></div><div style="font-weight:bold; color:var(--danger); font-size:12px">${e.count}</div></div>`;
      });
      if(vioChartDiv.innerHTML === '') vioChartDiv.innerHTML = '<div style="text-align:center; color:var(--text-muted)">لا توجد مخالفات ✅</div>';
  }

  const absentList = Object.values(absenceMap).sort((a,b) => b.count - a.count);
  const absChartDiv = $('absent_leaderboard');
  if(absChartDiv) {
      absChartDiv.innerHTML = '';
      const maxAbsVal = absentList[0]?.count || 0;
      absentList.slice(0, 5).forEach((e, i) => {
          if(e.count === 0) return;
          const pct = (maxAbsVal > 0) ? (e.count/maxAbsVal*100) : 0;
          absChartDiv.innerHTML += `<div class="bar-row"><div style="font-size:12px; line-height:1.2; overflow:hidden;"><div style="font-weight:bold">${i+1}. ${e.name}</div></div><div class="bar-track"><div class="bar-fill" style="width:${pct}%; background:var(--danger)"></div></div><div style="font-weight:bold; color:var(--danger); font-size:12px">${e.count}</div></div>`;
      });
      if(absChartDiv.innerHTML === '') absChartDiv.innerHTML = '<div style="text-align:center; color:var(--text-muted)">لا يوجد غياب ✅</div>';
  }

  const timelineContainer = $('timeline_chart');
  if(timelineContainer) {
      timelineContainer.innerHTML = '';
      const allDates = Object.keys(timelineData).sort();
      const sortedDates = allDates.slice(-30); 
      sortedDates.forEach(d => {
          const item = timelineData[d];
          const totalHeight = item.total > 0 ? Math.min(item.total * 5, 100) : 5; 
          const goodHeight = item.total > 0 ? (item.good / item.total * totalHeight) : 0;
          const badHeight = item.total > 0 ? (item.bad / item.total * totalHeight) : 0;
          const dateObj = new Date(d);
          timelineContainer.innerHTML += `<div class="timeline-group"><div class="timeline-score">${Math.round((item.good/item.total)*100)}%</div><div class="timeline-bars"><div class="t-bar-total" style="height:${totalHeight}px;" title="إجمالي: ${item.total}"></div><div class="t-bar-good" style="height:${goodHeight}px;" title="منضبط: ${item.good}"></div><div class="t-bar-bad" style="height:${badHeight}px;" title="مخالف: ${item.bad}"></div></div><div class="timeline-label">${dateObj.getDate()}/${dateObj.getMonth()+1}</div></div>`;
      });
  }

  let globalPct = 90; let gReason = "", gColor = "";
  if(grandTotalDays > 0) {
      globalPct = (grandTotalPoints / (grandTotalDays * 10)) * 100;
      if(totalSysProd > 100) globalPct += 2;
  } else globalPct = 50;
  if(globalPct > 100) globalPct = 100; if(globalPct < 0) globalPct = 0;
  if(globalPct < 50) { gReason = `منخفض`; gColor = "var(--danger)"; } 
  else if (globalPct < 70) { gReason = "متوسط"; gColor = "var(--warning)"; } 
  else if (globalPct < 90) { gReason = "جيد"; gColor = "#3b82f6"; } 
  else { gReason = "مميز"; gColor = "var(--success)"; }
  updateGauge('g', globalPct, gReason, gColor);

  let maxVio = 0, mostVioHall = "لا يوجد"; for(const [k, v] of Object.entries(hallViolations)){ if(v > maxVio) { maxVio = v; mostVioHall = k; } }
  if($('g_most_violations')) { $('g_most_violations').textContent = mostVioHall; $('g_most_violations_count').textContent = maxVio > 0 ? `${maxVio} مخالفة` : ''; }
  
  let maxAbs = 0, mostAbsHall = "لا يوجد"; for(const [k, v] of Object.entries(hallAbsent)){ if(v > maxAbs) { maxAbs = v; mostAbsHall = k; } }
  if($('g_most_absent')) { $('g_most_absent').textContent = mostAbsHall; $('g_most_absent_count').textContent = maxAbs > 0 ? `${maxAbs} غياب` : ''; }
  
  let maxDis = 0, mostDisHall = "لا يوجد"; for(const [k, v] of Object.entries(hallDiscipline)){ if(v > maxDis) { maxDis = v; mostDisHall = k; } }
  if($('g_most_disciplined')) { $('g_most_disciplined').textContent = mostDisHall; $('g_most_disciplined_count').textContent = maxDis > 0 ? `${maxDis} نقطة` : ''; }

  const statDiv = $('status_breakdown'); 
  if(statDiv) {
      statDiv.innerHTML = '';
      for(const [k, count] of Object.entries(statusCounts)){
        const def = STATUSES[k] || {label:k, color:'#fff'}; 
        const people = statsEvents.filter(x => x.status === k);
        let detailsHtml = '';
        people.forEach(p => { detailsHtml += `<div class="detail-row"><span>${p.employees.name}</span><span style="color:var(--text-muted)">${p.employees.hall}-${p.employees.shift} | ${p.event_date}</span></div>`; });
        statDiv.innerHTML += `<div class="breakdown-item" onclick="toggleDetails('${k}')"><div style="display:flex; justify-content:space-between; align-items:center"><span style="color:${def.color}">■ ${def.label}</span><span style="font-weight:bold">${count}</span></div></div><div id="details-${k}" class="breakdown-details">${detailsHtml}</div>`;
      }
  }
}

function toggleDetails(statusKey){
    const el = $(`details-${statusKey}`);
    if(el.style.display === 'block') el.style.display = 'none';
    else el.style.display = 'block';
}

/* =========================================
   11. إدارة الطلبات والمستخدمين (المصححة)
   ========================================= */
async function loadRequests() {
    const list = $('requestsList');
    list.innerHTML = 'جاري التحميل...';
    const { data: reqs } = await sb.from('employees').select('*').eq('is_approved', false).neq('email', null); 
    
    if(!reqs || reqs.length === 0) {
        list.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted)">لا توجد طلبات تسجيل جديدة</div>';
        return;
    }

    list.innerHTML = '';
    reqs.forEach(r => {
        if(!r.email) return;
        const item = document.createElement('div');
        item.style.cssText = "background:rgba(255,255,255,0.05); padding:15px; margin-bottom:10px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; border:1px solid var(--border)";
        item.innerHTML = `
          <div>
              <div style="font-weight:bold; color:var(--text-main)">${r.rank || ''} ${r.name}</div>
              <div style="font-size:12px; color:var(--text-muted)">${r.email}</div>
              <div style="font-size:11px; margin-top:5px; color:var(--productivity)">صالة ${r.hall || '-'} | مناوبة ${r.shift || '-'}</div>
          </div>
          <div style="display:flex; gap:10px">
              <button class="btn-primary" style="padding:8px 15px; font-size:12px; background:var(--success); width:auto" onclick="approveUser('${r.id}')">قبول ✅</button>
              <button class="btn-danger" style="padding:8px 15px; font-size:12px; width:auto" onclick="deleteUser('${r.id}')">رفض ❌</button>
          </div>
        `;
        list.appendChild(item);
    });
}

function toggleAllUsersList() {
    const el = document.getElementById('allUsersContainer');
    if (el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        loadAllApprovedUsers();
    } else {
        el.classList.add('hidden');
    }
}

async function loadAllApprovedUsers() {
    const list = $('allUsersList');
    list.innerHTML = 'جاري التحميل...';
    
    const { data: admins } = await sb.from('allowed_users').select('email');
    const adminEmails = admins ? admins.map(a => a.email.toLowerCase().trim()) : [];

    const { data: users } = await sb.from('employees').select('*').neq('email', null);
    
    if(!users || users.length === 0) {
        list.innerHTML = '<div style="padding:10px; text-align:center">لا يوجد مستخدمين مسجلين</div>';
        return;
    }

    list.innerHTML = '';
    users.forEach(r => {
        const userEmail = r.email ? r.email.toLowerCase().trim() : '';
        const isAdminUser = adminEmails.includes(userEmail);
        
        const statusBadge = r.is_approved 
          ? '<span style="color:var(--success); border:1px solid var(--success); padding:2px 6px; border-radius:4px; font-size:10px">نشط</span>' 
          : '<span style="color:var(--warning); border:1px solid var(--warning); padding:2px 6px; border-radius:4px; font-size:10px">غير مفعل</span>';

        let btnHtml = '';
        
        if(isAdminUser) {
            btnHtml = `<button class="btn-warning" style="padding:6px 12px; font-size:11px; width:auto" onclick="revokeAdmin('${r.email}')">سحب إدارة 🔽</button>`;
        } else {
            btnHtml = `<button class="btn-primary" style="padding:6px 12px; font-size:11px; background:var(--admin); width:auto" onclick="makeAdmin('${r.id}', '${r.email}')">ترقية لمدير 🔼</button>`;
        }
        
        if(!r.is_approved){
             btnHtml += `<button class="btn-primary" style="padding:6px 12px; font-size:11px; background:var(--success); width:auto; margin-right:5px" onclick="approveUser('${r.id}')">تفعيل الحساب ✅</button>`;
        }

        btnHtml += `<button class="btn-danger" style="padding:6px 12px; font-size:11px; width:auto; margin-right:5px" onclick="deleteSystemUser('${r.id}')">حذف 🗑️</button>`;

        const item = document.createElement('div');
        item.style.cssText = "background:rgba(0,0,0,0.2); padding:15px; margin-bottom:10px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; border:1px solid var(--border)";
        item.innerHTML = `
          <div>
              <div style="font-weight:bold; color:var(--text-main)">${r.rank || ''} ${r.name} ${statusBadge}</div>
              <div style="font-size:11px; color:var(--text-muted)">${r.email}</div>
          </div>
          <div style="display:flex; gap:5px; align-items:center; flex-wrap:wrap">
              ${btnHtml}
          </div>
        `;
        list.appendChild(item);
    });
}

async function approveUser(id) {
    if(!confirm('هل أنت متأكد من قبول هذا العضو؟')) return;
    const { error } = await sb.from('employees').update({ is_approved: true }).eq('id', id);
    if(error) alert('خطأ: ' + error.message); else { loadRequests(); checkNotifications(); loadEmployees(); loadAllApprovedUsers(); }
}

async function makeAdmin(id, email) {
    if(!email) return alert('هذا المستخدم ليس لديه إيميل مسجل');
    if(!confirm('هل أنت متأكد من منح صلاحيات كاملة (مدير)؟')) return;
    const { error } = await sb.from('allowed_users').insert({ email: email.toLowerCase().trim() });
    if(error) alert(error.message); else { alert('تمت الترقية بنجاح ✅'); loadAllApprovedUsers(); }
}

async function revokeAdmin(email) {
    if(!confirm('هل أنت متأكد من سحب صلاحيات المدير؟')) return;
    const { error } = await sb.from('allowed_users').delete().eq('email', email.toLowerCase().trim());
    if(error) alert(error.message); else { alert('تم سحب الصلاحيات'); loadAllApprovedUsers(); }
}

async function deleteSystemUser(id) {
    if(!confirm('تحذير: سيتم حذف هذا المستخدم نهائياً من النظام. هل أنت متأكد؟')) return;
    const { error } = await sb.from('employees').delete().eq('id', id);
    if(error) alert(error.message); else { alert('تم حذف المستخدم'); loadAllApprovedUsers(); loadEmployees(); }
}

async function approveAllUsers() {
    if(!confirm('هل أنت متأكد من قبول جميع الطلبات المعلقة؟')) return;
    const { error } = await sb.from('employees').update({ is_approved: true }).eq('is_approved', false);
    if(error) alert('خطأ: ' + error.message); else { alert('تم قبول الجميع ✅'); loadRequests(); checkNotifications(); loadEmployees(); }
}

async function deleteUser(id) { 
    if(!confirm('سيتم رفض وحذف الطلب. هل أنت متأكد؟')) return;
    const { error } = await sb.from('employees').delete().eq('id', id);
    if(error) alert('خطأ: ' + error.message); else { loadRequests(); checkNotifications(); }
}

async function checkNotifications() {
    const { count } = await sb.from('employees').select('*', { count: 'exact', head: true }).eq('is_approved', false).neq('email', null);
    if(count > 0) {
        $('reqBadge').textContent = count;
        $('reqBadge').classList.remove('hidden');
    } else {
        $('reqBadge').classList.add('hidden');
    }
}

async function moveEmployee(){
  if (!isAdmin) { alert('⛔ عذراً، الحساب للمشاهدة فقط.'); return; }
  const id=$('m_emp').value, h=$('m_new_hall').value, s=$('m_new_shift').value, t=$('m_new_type').value;
  if(!id) return;
  
  const updates = { hall: h, shift: s };
  if(t) updates.hall_type = t;

  const {error} = await sb.from('employees').update(updates).eq('id',id);
  if(error) { $('moveMsg').textContent = 'خطأ: ' + error.message; } 
  else { $('moveMsg').textContent = 'تم النقل بنجاح ✅'; loadEmployees(); }
}

async function addNewEmployeeManual() {
    if (!isAdmin) { alert('⛔ عذراً، الحساب للمشاهدة فقط.'); return; }
    const name = $('add_name').value;
    const rank = $('add_rank').value;
    const hall = $('add_hall').value;
    const shift = $('add_shift').value;
    const type = $('add_type').value;

    if(!name || !rank) return alert('يرجى كتابة الاسم والرتبة');

    const fakeId = crypto.randomUUID();

    const { error } = await sb.from('employees').insert({
        id: fakeId,
        name: name,
        rank: rank,
        hall: hall,
        shift: shift,
        hall_type: type,
        is_approved: true, 
        email: null 
    });

    if(error) alert('خطأ: ' + error.message);
    else { 
        alert('تمت إضافة الفرد بنجاح ✅'); 
        $('add_name').value = ''; 
        loadEmployees(); 
    }
}

async function deleteEmployeeManual() {
    if (!isAdmin) { alert('⛔ عذراً، الحساب للمشاهدة فقط.'); return; }
    const id = $('del_emp_select').value;
    if(!id) return;

    if(!confirm('تحذير هام: سيتم حذف هذا الفرد وجميع سجلاته نهائياً. هل أنت متأكد؟')) return;

    const { error } = await sb.from('employees').delete().eq('id', id);
    if(error) alert('خطأ: ' + error.message);
    else {
        alert('تم الحذف بنجاح 🗑️');
        loadEmployees();
    }
}

// ===============================================
// === إصلاح شامل لدوال الفلترة (القوائم المنسدلة) ===
// ===============================================

function filterMoveSelect(){
    const txt = $('search_move_emp') ? $('search_move_emp').value.toLowerCase() : '';
    const el = $('m_emp'); 
    if(!el) return;
    el.innerHTML = '';
    
    // إظهار الكل إذا لم يكن هناك بحث، أو الفلترة حسب الاسم
    const filtered = employees.filter(e => !txt || e.name.toLowerCase().includes(txt));
    
    if(filtered.length === 0) {
        el.innerHTML = '<option value="">لا يوجد نتائج</option>';
    } else {
        filtered.forEach(e => el.innerHTML += `<option value="${e.id}">${e.name} (${e.hall}-${e.shift})</option>`);
        el.selectedIndex = 0;
    }
}

function filterDeleteSelect(){
    const txt = $('search_del_emp') ? $('search_del_emp').value.toLowerCase() : '';
    const el = $('del_emp_select'); 
    if(!el) return;
    el.innerHTML = '';
    
    const filtered = employees.filter(e => !txt || e.name.toLowerCase().includes(txt));
    
    if(filtered.length === 0) {
        el.innerHTML = '<option value="">لا يوجد نتائج</option>';
    } else {
        filtered.forEach(e => el.innerHTML += `<option value="${e.id}">${e.name} (${e.hall}-${e.shift})</option>`);
        el.selectedIndex = 0;
    }
}

function filterEditSelect(){
    const txt = $('e_search') ? $('e_search').value.toLowerCase() : '';
    const el = $('e_emp_select'); 
    if(!el) return;
    el.innerHTML = '';
    
    const filtered = employees.filter(e => !txt || e.name.toLowerCase().includes(txt));
    
    if(filtered.length === 0) {
        el.innerHTML = '<option value="">لا يوجد نتائج</option>';
    } else {
        filtered.forEach(e => el.innerHTML += `<option value="${e.id}">${e.name} (${e.hall}-${e.shift})</option>`);
        el.selectedIndex = 0;
    }
}

async function fetchStatForEdit(){
    const eid = $('e_emp_select').value; const y = $('e_year').value, m = $('e_month').value;
    if(!eid) return; $('editMsg').textContent = 'جاري البحث...';
    const {data} = await sb.from('monthly_stats').select('score').eq('employee_id', eid).eq('year', y).eq('month', m).single();
    $('editStatArea').classList.remove('hidden'); $('e_score_val').value = data ? data.score : 0; $('editMsg').textContent = '';
}
async function updateStat(){
    if (!isAdmin) { alert('⛔ عذراً، الحساب للمشاهدة فقط.'); return; }
    const eid = $('e_emp_select').value; const y = $('e_year').value, m = $('e_month').value; const val = $('e_score_val').value;
    const {error} = await sb.from('monthly_stats').upsert({employee_id: eid, year: y, month: m, score: parseInt(val)}, {onConflict:'employee_id,year,month'});
    $('editMsg').textContent = error ? 'خطأ' : 'تم التحديث ✅';
}
async function deleteStat(){
    if (!isAdmin) { alert('⛔ عذراً، الحساب للمشاهدة فقط.'); return; }
    if(!confirm('هل أنت متأكد؟')) return;
    const eid = $('e_emp_select').value; const y = $('e_year').value, m = $('e_month').value;
    const {error} = await sb.from('monthly_stats').delete().eq('employee_id', eid).eq('year', y).eq('month', m);
    $('editMsg').textContent = error ? 'خطأ' : 'تم الحذف 🗑️'; if(!error) $('e_score_val').value = 0;
}