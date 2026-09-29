const KEY='trienLifeV2';

const defaultData={
    wallets:[
        {id:1,name:'Ví ngân hàng',sub:'Vietcombank',balance:5200000,icon:'🏦',cls:'bank'},
        {id:2,name:'Tiền mặt',sub:'Tiền mặt',balance:850000,icon:'▣',cls:'cash'},
        {id:3,name:'MoMo',sub:'Ví điện tử',balance:320000,icon:'mo',cls:'momo'},
        {id:4,name:'Thẻ tín dụng',sub:'Visa',balance:1080000,icon:'▤',cls:'cardblue'}
    ],
    transactions:[
        {id:1,type:'expense',name:'Ăn trưa',cat:'Ăn uống',wallet:2,amount:50000,date:'24/09/2026',time:'12:30'},
        {id:2,type:'expense',name:'Học phí',cat:'Học tập',wallet:1,amount:200000,date:'24/09/2026',time:'09:15'},
        {id:3,type:'income',name:'Lương',cat:'Thu nhập',wallet:1,amount:4000000,date:'23/09/2026',time:'08:00'},
        {id:4,type:'expense',name:'Mua sách',cat:'Học tập',wallet:3,amount:120000,date:'18/09/2026',time:'16:20'},
        {id:5,type:'expense',name:'Đi cafe',cat:'Giải trí',wallet:2,amount:85000,date:'16/09/2026',time:'14:10'}
    ],
    tasks:[
        {id:1,name:'Học DSA',time:'13:30',date:dateKey(),done:true,cls:'green'},
        {id:2,name:'Làm bài C++',time:'15:00',date:dateKey(),done:false,cls:'blue'},
        {id:3,name:'Tập thể dục',time:'18:30',date:dateKey(),done:false,cls:'pink'},
        {id:4,name:'Đọc sách',time:'20:00',date:dateKey(),done:false,cls:'purple'}
    ],
    settings:{
        hide:false,
        notify:true,
        dark:false
    }
};

let data=JSON.parse(localStorage.getItem(KEY)||'null')||structuredClone(defaultData);

let page='home';

let timerSec=1500;
let timerTotal=1500;
let timerInt=null;

let taskTab='work';
let moneyVisible=true;

let scheduleTab='work';
let statsTab='category';
let financeTab='overview';
let selectedDate=todayDate();

let timerMode='countdown';
let reminderCheckInt=null;

let selectedWalletForTx=null;
let lastTodayKey=null;
let dayRefreshTimer=null;


/* =========================
   LOCAL DATA
========================= */

const money=n=>
    new Intl.NumberFormat('vi-VN').format(n)+'đ';

const save=()=>
    localStorage.setItem(KEY,JSON.stringify(data));

const esc=s=>
    String(s).replace(
        /[&<>"']/g,
        m=>({
            '&':'&amp;',
            '<':'&lt;',
            '>':'&gt;',
            '"':'&quot;',
            "'":'&#039;'
        }[m])
    );

function total(){
    return data.wallets.reduce(
        (s,w)=>s+Number(w.balance||0),
        0
    );
}

function wallet(id){
    return data.wallets.find(w=>w.id==id);
}

function todayDate(){
    const now=new Date();
    return new Date(now.getFullYear(),now.getMonth(),now.getDate());
}

function dateKey(date=todayDate(),month,year){
    if(!(date instanceof Date))
        date=new Date(year??todayDate().getFullYear(),(month??todayDate().getMonth()+1)-1,date);

    return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
}

function dateInputValue(date=todayDate()){
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function parseDateKey(value){
    if(!value)
        return null;

    const parts=String(value).split(/[/-]/);

    if(parts.length!==3)
        return null;

    const [a,b,c]=parts.map(Number);
    const date=parts[0].length===4
        ?new Date(a,b-1,c)
        :new Date(c,b-1,a);

    return Number.isNaN(date.getTime())?null:date;
}

function tasksForDate(date=selectedDate){
    return data.tasks.filter(
        t=>(t.date||dateKey(todayDate()))===dateKey(date)
    );
}

function ensureTaskDates(){
    let changed=false;

    data.tasks.forEach(t=>{
        if(!t.date){
            t.date=dateKey(todayDate());
            changed=true;
        }
    });

    if(!Number.isFinite(Number(data.points))){
        data.points=data.tasks.filter(t=>t.done).length;
        changed=true;
    }else{
        data.points=Math.max(0,Number(data.points));
    }

    if(changed) save();
}

function updateForNewDay(){
    const today=todayDate();
    const todayKey=dateKey(today);

    if(lastTodayKey===null){
        lastTodayKey=todayKey;
        return;
    }

    if(lastTodayKey===todayKey)
        return;

    const previousKey=lastTodayKey;
    lastTodayKey=todayKey;

    if(dateKey(selectedDate)===previousKey)
        selectedDate=today;

    render();
}

function scheduleDailyRefresh(){
    clearTimeout(dayRefreshTimer);

    const now=new Date();
    const nextDay=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,0,0,1);

    dayRefreshTimer=setTimeout(()=>{
        updateForNewDay();
        scheduleDailyRefresh();
    },Math.max(1,nextDay-now));
}

function fmt(v){
    return moneyVisible?money(v):'••••••';
}


/* =========================
   NAVIGATION
========================= */

function navIcon(name){

    const icons={

        home:
        '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5M9.5 21v-6h5v6"/></svg>',

        schedule:
        '<svg viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 10h16"/><path d="M8 13h2M14 13h2M8 17h2"/></svg>',

        finance:
        '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M3.5 9h17M7 14h3M15 14h2"/></svg>',

        timer:
        '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="7.5"/><path d="M12 13V9.5M9.5 3.5h5M12 5.5v-2M18 7l1.5-1.5"/></svg>',

        settings:
        '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.42 1.42-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21.6h-2v-.08a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.42-1.42.06-.06A1.7 1.7 0 0 0 9.4 15a1.7 1.7 0 0 0-1.56-1.03H7.6v-2h.24A1.7 1.7 0 0 0 9.4 11a1.7 1.7 0 0 0-.34-1.88L9 9.06l1.42-1.42.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.42 1.42-.06.06A1.7 1.7 0 0 0 19.4 11a1.7 1.7 0 0 0 1.56 1.03h.24v2h-.24A1.7 1.7 0 0 0 19.4 15Z"/></svg>'
    };

    return icons[name]||'';
}

function nav(){

    let items=[
        ['home','Trang chủ'],
        ['schedule','Lịch trình'],
        ['finance','Tài chính'],
        ['timer','Hẹn giờ'],
        ['settings','Cài đặt']
    ];

    document.getElementById('bottomNav').innerHTML=
        items.map(x=>
            `<button class="${page===x[0]?'active':''}"
                aria-label="${x[1]}"
                type="button"
                onclick="go('${x[0]}')">
                <span class="nav-icon">${navIcon(x[0])}</span>
                <small>${x[1]}</small>
            </button>`
        ).join('');
}

function go(p){

    page=p;

    render();

    window.scrollTo({
        top:0,
        behavior:'smooth'
    });
}


/* =========================
   RENDER
========================= */

function render(){

    ensureTaskDates();

    const screen=document.getElementById('screen');
    const bottomNav=document.getElementById('bottomNav');

    if(!screen||!bottomNav)
        return;

    nav();

    screen.innerHTML=
        page==='home'
        ?home()
        :page==='schedule'
        ?schedule()
        :page==='timer'
        ?timerPage()
        :page==='finance'
        ?finance()
        :page==='settings'
        ?settings()
        :'';

    if(data.settings.dark)
        document.body.classList.add('dark');
    else
        document.body.classList.remove('dark');
}


/* =========================
   HOME
========================= */

function home(){

    return `
    <div class="screen">

        <div class="hero">
            <h1>Triển Life</h1>
            <p>Kỷ luật hơn, tự do ngày mai</p>
        </div>

        <div class="hello">
            <b>Xin chào, Triển 👋</b>
            <small>${todayDate().toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</small>

            <div class="quote">
                “Mỗi ngày là một cơ hội để tốt hơn so với chính mình.”
            </div>
        </div>

        <div class="points-card" aria-label="Điểm thưởng">
            <div>
                <small>Điểm tích lũy</small>
                <b>${Number(data.points)||0}</b>
            </div>
            <span>điểm</span>
        </div>

        <div class="section-head">
            <h3>Nhiệm vụ (${data.tasks.length})</h3>
            <button type="button" onclick="go('schedule')">Xem tất cả ›</button>
        </div>

        ${data.tasks.map(t=>taskHTML(t)).join('')}

        <div class="section-head">
            <h3>Hẹn giờ</h3>
        </div>

        <div class="mini-timer">

            <div class="timer-icon">◷</div>

            <div class="grow">
                <b>Phiên tập trung 25 phút</b>
                <small>${timerInt?'Đang chạy':'Sẵn sàng'}</small>
            </div>

            <button
                class="play"
                type="button"
                onclick="go('timer')">
                ▶
            </button>

        </div>

        <div class="section-head">
            <h3>Tài chính tháng này</h3>
            <button type="button" onclick="go('finance')">
                Xem chi tiết ›
            </button>
        </div>

        <div class="finance-summary">

            <div>
                <small>Thu nhập</small>
                <b class="green-t">4.000.000đ</b>
            </div>

            <div>
                <small>Chi tiêu</small>
                <b class="red-t">1.250.000đ</b>
            </div>

            <div>
                <small>Số dư</small>
                <b>${money(total())}</b>
            </div>

        </div>

    </div>`;
}

function taskHTML(t){

    return `
    <div class="task ${t.cls} ${t.done?'task-done':''}" onclick="toggleTask(${t.id})">

        <span class="check ${t.done?'done':''}">
            ${t.done?'✓':''}
        </span>

        <div>
            <div class="name">${esc(t.name)}</div>
            <div class="time">${t.time}</div>
        </div>

        <span class="dots">⋮</span>

    </div>`;
}


/* =========================
   SCHEDULE
========================= */

function schedule(){

    return `
    <div class="screen">

        <div class="top">

            <h1>Lịch trình</h1>

            <button
                class="primary"
                type="button"
                style="width:30px;height:30px;padding:0;border-radius:50%"
                onclick="taskModal()">
                ＋
            </button>

        </div>

        <div class="tabs">

            <button
                type="button"
                class="${scheduleTab==='work'?'active':''}"
                onclick="setScheduleTab('work')">
                Công việc
            </button>

            <button
                type="button"
                class="${scheduleTab==='day'?'active':''}"
                onclick="setScheduleTab('day')">
                Lịch ngày
            </button>

            <button
                type="button"
                class="${scheduleTab==='reminder'?'active':''}"
                onclick="setScheduleTab('reminder')">
                Nhắc việc
            </button>

        </div>

        ${
            scheduleTab==='work'
            ?scheduleWork()
            :scheduleTab==='day'
            ?scheduleDay()
            :scheduleReminder()
        }

    </div>`;
}

function setScheduleTab(tab){

    scheduleTab=tab;

    render();
}

function scheduleWork(){

    const weekStart=new Date(selectedDate);
    weekStart.setDate(selectedDate.getDate()-((selectedDate.getDay()+6)%7));

    return `
    <div class="search">

        <span>⌕</span>

        <input
            id="searchTask"
            oninput="filterTasks()"
            placeholder="Tìm kiếm công việc...">

    </div>

    <div class="date-strip">

        ${
            ['T2','T3','T4','T5','T6','T7','CN']
            .map((d,i)=>
                (()=>{
                    const dayDate=new Date(weekStart);
                    dayDate.setDate(weekStart.getDate()+i);
                    return `<button
                    type="button"
                    class="day ${dateKey(dayDate)===dateKey(selectedDate)?'active':''}"
                    onclick="selectScheduleDate('${dateKey(dayDate)}')">

                    ${d}

                    <b>${dayDate.getDate()}</b>

                </button>`;
                })()
            ).join('')
        }

    </div>

    <div class="section-head">
        <h3>${dateKey(selectedDate)} (${tasksForDate(selectedDate).length})</h3>
    </div>

    <div id="taskList">
        ${tasksForDate(selectedDate).map(taskHTML).join('')||'<div class="empty">Không có công việc trong ngày này</div>'}
    </div>

    <button
        class="primary full"
        type="button"
        onclick="taskModal()">
        ＋ Thêm công việc
    </button>`;
}


/* =========================
   LỊCH NGÀY
========================= */

function scheduleDay(){

    let list=tasksForDate(selectedDate);
    const year=selectedDate.getFullYear();
    const month=selectedDate.getMonth();
    const firstDay=new Date(year,month,1);
    const offset=(firstDay.getDay()+6)%7;
    const daysInMonth=new Date(year,month+1,0).getDate();
    const cellCount=Math.ceil((offset+daysInMonth)/7)*7;
    const todayKey=dateKey(todayDate());

    return `
    <div class="page-calendar">

        <div class="calendar-head">

            <button type="button" onclick="changeMonth(-1)">‹</button>

            <b>${selectedDate.toLocaleDateString('vi-VN',{month:'long',year:'numeric'})}</b>

            <button type="button" onclick="changeMonth(1)">›</button>

        </div>

        <div class="calendar-grid">

            ${
                ['T2','T3','T4','T5','T6','T7','CN']
                .map(x=>`<span>${x}</span>`)
                .join('')
            }

            ${
                Array.from({length:cellCount},(_,i)=>{

                    const day=i-offset+1;

                    if(day<1||day>daysInMonth)
                        return '<span></span>';

                    const cellDate=new Date(year,month,day);
                    const key=dateKey(cellDate);
                    const selected=key===dateKey(selectedDate);

                    return `
                    <button
                        type="button"
                        onclick="selectScheduleDate('${key}')"
                        class="${selected?'today':''} ${key===todayKey?'calendar-current':''}"
                        ${key===todayKey?'aria-current="date"':''}>
                        ${day}
                    </button>`;

                }).join('')
            }

        </div>

        <div class="timeline">

            <div>

                <b style="font-size:11px">

                    ${
                        dateKey(selectedDate)===todayKey
                        ?'Hôm nay, '
                        :''
                    }

                    ${dateKey(selectedDate)}

                </b>

                <small
                    style="display:block;color:#8a96aa;font-size:9px;margin-top:4px">

                    ${
                        list.length
                        ?list.length+' sự kiện'
                        :'Không có sự kiện'
                    }

                </small>

            </div>

            ${
                list.map(t=>
                    `<button
                        type="button"
                        class="timeline-row"
                        onclick="editTask(${t.id})">

                        <span class="dot ${
                            t.cls==='blue'
                            ?'blue'
                            :t.cls==='pink'
                            ?'pink'
                            :t.cls==='purple'
                            ?'purple'
                            :''
                        }"></span>

                        <span style="width:42px;color:#6e7a8d">
                            ${esc(t.time)}
                        </span>

                        <b>${esc(t.name)}</b>

                        <span class="event-edit">
                            ✎
                        </span>

                    </button>`
                ).join('')
                ||
                '<div class="empty">Không có sự kiện trong ngày này</div>'
            }

        </div>

    </div>`;
}


function scheduleReminder(){

    return `
    <div class="reminder-box">

        <div class="reminder-head">

            <div>
                <b>Nhắc việc</b>
                <small>Những việc cần nhắc bạn trong ngày</small>
            </div>

            <button
                class="primary"
                type="button"
                style="width:auto;padding:8px 14px"
                onclick="reminderModal()">
                ＋ Thêm
            </button>

        </div>

        ${
            data.tasks.map(t=>
                `<div class="reminder-row ${t.done?'task-done':''}">

                    <button
                        type="button"
                        class="check ${t.done?'done':''}"
                        onclick="toggleTask(${t.id})">

                        ${t.done?'✓':''}

                    </button>

                    <div class="grow">

                        <b>${esc(t.name)}</b>

                        <small>
                            ${esc(t.date||'')}
                            · Nhắc lúc ${esc(t.time)}
                        </small>

                    </div>

                    <button
                        type="button"
                        class="reminder-edit"
                        onclick="editTask(${t.id})">

                        ✎

                    </button>

                </div>`
            ).join('')

            ||

            '<div class="empty">Chưa có nhắc việc</div>'
        }

    </div>`;
}

function selectScheduleDate(d){

    selectedDate=typeof d==='number'
        ?new Date(selectedDate.getFullYear(),selectedDate.getMonth(),d)
        :parseDateKey(d)||todayDate();

    scheduleTab='day';

    render();

    toast(
        `Đã chọn ngày ${dateKey(selectedDate)}`
    );
}

function changeMonth(delta){

    const nextMonth=new Date(selectedDate.getFullYear(),selectedDate.getMonth()+delta,1);
    const lastDay=new Date(nextMonth.getFullYear(),nextMonth.getMonth()+1,0).getDate();
    selectedDate=new Date(nextMonth.getFullYear(),nextMonth.getMonth(),Math.min(selectedDate.getDate(),lastDay));
    render();
}

function reminderModal(){

    taskModal();
}


/* =========================
   SỬA / XÓA SỰ KIỆN
========================= */

function editTask(id){

    const t=data.tasks.find(x=>x.id==id);

    if(!t)
        return toast('Không tìm thấy sự kiện');

    const dateValue=dateInputValue(parseDateKey(t.date)||todayDate());

    openSheet(`

        <div class="close-row">

            <h3>Sửa sự kiện</h3>

            <button
                type="button"
                onclick="closeSheet()">
                ×
            </button>

        </div>

        <div class="field">

            <label>Tên sự kiện</label>

            <input
                id="editTaskName"
                class="input"
                value="${esc(t.name)}"
                placeholder="Nhập tên sự kiện">

        </div>

        <div class="field">

            <label>Ngày</label>

            <input
                id="editTaskDate"
                type="date"
                class="input"
                value="${dateValue}">

        </div>

        <div class="field">

            <label>Thời gian</label>

            <input
                id="editTaskTime"
                type="time"
                class="input"
                value="${esc(t.time||'15:00')}">

        </div>

        <button
            type="button"
            class="primary green full"
            style="margin-top:15px"
            onclick="updateTask(${id})">

            Lưu thay đổi

        </button>

        <button
            type="button"
            class="danger full"
            style="margin-top:8px"
            onclick="removeTask(${id})">

            Xóa sự kiện

        </button>

    `);
}

function updateTask(id){

    const t=data.tasks.find(x=>x.id==id);

    if(!t)
        return toast('Không tìm thấy sự kiện');

    const name=
        document
        .getElementById('editTaskName')
        ?.value
        .trim();

    const time=
        document
        .getElementById('editTaskTime')
        ?.value;

    const date=
        document
        .getElementById('editTaskDate')
        ?.value;

    if(!name)
        return toast('Nhập tên sự kiện');

    if(!time)
        return toast('Chọn thời gian');

    if(!date)
        return toast('Chọn ngày');

    t.name=name;
    t.time=time;
    t.date=dateKey(parseDateKey(date));

    save();

    closeSheet();

    render();

    toast('Đã cập nhật sự kiện');
}

function removeTask(id){

    const t=data.tasks.find(x=>x.id==id);

    if(!t)
        return toast('Không tìm thấy sự kiện');

    if(!confirm(`Xóa "${t.name}"?`))
        return;

    data.tasks=
        data.tasks.filter(
            x=>x.id!=id
        );

    save();

    closeSheet();

    render();

    toast('Đã xóa sự kiện');
}

function filterTasks(){

    const input=
        document.getElementById('searchTask');

    const list=
        document.getElementById('taskList');

    if(!input||!list)
        return;

    let q=input.value.toLowerCase();

    list.innerHTML=
        tasksForDate(selectedDate)
        .filter(
            t=>
                String(t.name)
                .toLowerCase()
                .includes(q)
        )
        .map(taskHTML)
        .join('');
}

function toggleTask(id){

    let t=data.tasks.find(x=>x.id==id);

    if(!t)
        return;

    t.done=!t.done;
    data.points=Math.max(0,(Number(data.points)||0)+(t.done?1:-1));

    save();

    render();

    toast(
        t.done
        ?'Đã hoàn thành'
        :'Đã bỏ hoàn thành'
    );
}

function taskModal(){

    openSheet(`

        <div class="close-row">

            <h3>Thêm công việc</h3>

            <button
                type="button"
                onclick="closeSheet()">
                ×
            </button>

        </div>

        <div class="field">

            <label>Tên công việc</label>

            <input
                id="taskName"
                class="input"
                placeholder="Ví dụ: Học DSA">

        </div>

        <div class="field">

            <label>Ngày</label>

            <input
                id="taskDate"
                type="date"
                class="input"
                value="${dateInputValue(selectedDate)}">

        </div>

        <div class="field">

            <label>Thời gian</label>

            <input
                id="taskTime"
                type="time"
                class="input"
                value="15:00">

        </div>

        <button
            type="button"
            class="primary full"
            style="margin-top:16px"
            onclick="addTask()">

            Thêm công việc

        </button>

    `);
}

function addTask(){

    let n=
        document
        .getElementById('taskName')
        ?.value
        .trim();

    let time=
        document
        .getElementById('taskTime')
        ?.value
        ||'15:00';

    let date=
        document
        .getElementById('taskDate')
        ?.value;

    if(!n)
        return toast('Nhập tên công việc');

    if(!date)
        date=dateInputValue(selectedDate);

    data.tasks.push({

        id:Date.now(),

        name:n,

        time,

        date:dateKey(parseDateKey(date)),

        done:false,

        cls:'blue'

    });

    save();

    closeSheet();

    render();

    toast('Đã thêm công việc');
}


/* =========================
   TIMER
========================= */

function timerPage(){

    if(timerInt)
        return runningTimer();

    return `
    <div class="screen">

        <div class="top">

            <h1>Hẹn giờ</h1>

            <button
                class="more"
                type="button">
                ⋮
            </button>

        </div>

        <div class="timer-select">

            <div class="timer-toggle">

                <button
                    type="button"
                    class="${timerMode==='countdown'?'active':''}"
                    onclick="setTimerMode('countdown')">
                    Đếm ngược
                </button>

                <button
                    type="button"
                    class="${timerMode==='reminder'?'active':''}"
                    onclick="setTimerMode('reminder')">
                    Nhắc việc
                </button>

            </div>

            ${
                timerMode==='countdown'
                ?timerCountdownForm()
                :timerReminderForm()
            }

        </div>

    </div>`;
}

function setTimerMode(mode){

    timerMode=mode;

    render();
}

function timerCountdownForm(){

    return `
    <div class="timer-hero">

        <div class="stopwatch">◷</div>

        <h2>Đặt thời gian đếm ngược</h2>

        <div class="free-time">

            <div>

                <label>Phút</label>

                <input
                    id="timerMinutes"
                    type="number"
                    min="0"
                    max="9999"
                    value="${Math.floor(timerSec/60)}">

            </div>

            <span>:</span>

            <div>

                <label>Giây</label>

                <input
                    id="timerSeconds"
                    type="number"
                    min="0"
                    max="59"
                    value="${timerSec%60}">

            </div>

        </div>

        <div class="quick-times">

            <button type="button" onclick="setTimerPreset(5)">5 phút</button>
            <button type="button" onclick="setTimerPreset(15)">15 phút</button>
            <button type="button" onclick="setTimerPreset(25)">25 phút</button>
            <button type="button" onclick="setTimerPreset(60)">1 giờ</button>

        </div>

        <label class="label">
            Tiêu đề (tùy chọn)
        </label>

        <input
            id="timerTitle"
            class="input"
            value="${esc(localStorage.getItem('timerTitle')||'')}"
            placeholder="Ví dụ: Tập trung học bài">

        <button
            type="button"
            class="primary green full"
            style="margin-top:14px"
            onclick="startTimer()">
            Bắt đầu
        </button>

    </div>`;
}

function setTimerPreset(min){

    timerSec=min*60;

    render();
}

function timerReminderForm(){

    let now=new Date();

    let date=dateInputValue(now);

    let time=
        now.toTimeString().slice(0,5);

    return `
    <div class="timer-hero reminder-form">

        <div class="stopwatch">🔔</div>

        <h2>Tạo nhắc việc</h2>

        <label class="label">Nội dung</label>

        <input
            id="reminderTitle"
            class="input"
            placeholder="Ví dụ: Học DSA">

        <label class="label">Ngày</label>

        <input
            id="reminderDate"
            type="date"
            class="input"
            value="${date}">

        <label class="label">Giờ nhắc</label>

        <input
            id="reminderTime"
            type="time"
            class="input"
            value="${time}">

        <button
            type="button"
            class="primary green full"
            style="margin-top:14px"
            onclick="createReminder()">
            Đặt nhắc việc
        </button>

        <small class="hint">
            Bạn cần cho phép thông báo để nhận cảnh báo.
        </small>

    </div>`;
}

function createReminder(){

    let name=
        document
        .getElementById('reminderTitle')
        ?.value
        .trim();

    let d=
        document
        .getElementById('reminderDate')
        ?.value;

    let tm=
        document
        .getElementById('reminderTime')
        ?.value;

    if(!name||!d||!tm)
        return toast(
            'Hãy nhập đủ nội dung, ngày và giờ'
        );

    let [y,m,day]=d.split('-');

    data.tasks.push({

        id:Date.now(),

        name,

        time:tm,

        date:`${day}/${m}/${y}`,

        done:false,

        cls:'blue'

    });

    save();

    closeSheet();

    requestNotifyPermission();

    scheduleReminderChecks();

    toast('Đã tạo nhắc việc');

    setTimeout(
        ()=>render(),
        250
    );
}

function requestNotifyPermission(){

    if(
        'Notification' in window &&
        Notification.permission==='default'
    ){

        Notification
            .requestPermission()
            .catch(()=>{});
    }
}

function startReminderChecks(){

    if(reminderCheckInt)
        return;

    reminderCheckInt=
        setInterval(
            checkDueReminders,
            15000
        );
}

function scheduleReminderChecks(){

    startReminderChecks();

    checkDueReminders();
}

function checkDueReminders(){

    if(!data.settings.notify)
        return;

    let now=new Date();

    let key=dateKey(now);

    let tm=
        now.toTimeString().slice(0,5);

    data.tasks
        .filter(
            t=>
                !t.done &&
                t.date===key &&
                t.time===tm
        )
        .forEach(t=>{

            let mark=
                `reminder_${t.id}_${key}_${tm}`;

            if(sessionStorage.getItem(mark))
                return;

            sessionStorage.setItem(mark,'1');

            notify(
                'Triển Life',
                `Đã đến giờ: ${t.name}`
            );
        });
}

function runningTimer(){

    return `
    <div class="timer-running">

        <div class="top">

            <button
                type="button"
                onclick="stopTimer()">
                ×
            </button>

            <h1>Hẹn giờ</h1>

            <button type="button">⚙</button>

        </div>

        <div class="ring">

            <div class="ring-inner">

                <b>
                    ${String(Math.floor(timerSec/60)).padStart(2,'0')}:${String(timerSec%60).padStart(2,'0')}
                </b>

                <small>Đếm ngược</small>

            </div>

        </div>

        <div class="running-card">

            <div class="ico">◷</div>

            <div>

                <b>
                    ${esc(
                        localStorage.getItem('timerTitle')
                        ||
                        'Tập trung học DSA'
                    )}
                </b>

                <small>
                    ${Math.ceil(timerTotal/60)} phút
                </small>

            </div>

        </div>

        <div class="run-actions">

            <button
                type="button"
                onclick="resetTimer()">
                ↻<br>Reset
            </button>

            <button
                type="button"
                class="pause"
                onclick="pauseTimer()">
                Ⅱ
            </button>

            <button
                type="button"
                onclick="addMinute()">
                ＋<br>+1 phút
            </button>

        </div>

    </div>`;
}

function startTimer(){

    let mins=
        Math.max(
            0,
            parseInt(
                document.getElementById('timerMinutes')?.value||0
            )
        );

    let secs=
        Math.min(
            59,
            Math.max(
                0,
                parseInt(
                    document.getElementById('timerSeconds')?.value||0
                )
            )
        );

    timerSec=mins*60+secs;

    if(timerSec<=0)
        return toast(
            'Hãy đặt thời gian lớn hơn 0'
        );

    let title=
        document
        .getElementById('timerTitle')
        ?.value
        .trim()
        ||
        'Tập trung học DSA';

    localStorage.setItem(
        'timerTitle',
        title
    );

    requestNotifyPermission();

    timerTotal=timerSec;

    clearInterval(timerInt);

    timerInt=
        setInterval(
            ()=>{

                timerSec--;

                if(timerSec<=0){

                    clearInterval(timerInt);

                    timerInt=null;

                    timerSec=0;

                    notify(
                        'Triển Life',
                        'Hẹn giờ đã kết thúc ⏰'
                    );

                    toast(
                        'Hẹn giờ đã kết thúc'
                    );
                }

                render();

            },
            1000
        );

    render();
}

function pauseTimer(){

    clearInterval(timerInt);

    timerInt=null;

    render();
}

function stopTimer(){

    clearInterval(timerInt);

    timerInt=null;

    timerSec=timerTotal=1500;

    render();
}

function resetTimer(){

    timerSec=timerTotal=1500;

    clearInterval(timerInt);

    timerInt=null;

    render();
}

function addMinute(){

    timerSec+=60;

    timerTotal+=60;

    render();
}


/* =========================
   FINANCE
========================= */

function finance(){

    return `
    <div class="screen">

        <div class="finance-head">

            <div class="top">

                <div>

                    <h1>Tài chính</h1>

                    <p>
                        Quản lý chi tiêu · Tích lũy tương lai
                    </p>

                </div>

                <button
                    class="more"
                    type="button"
                    onclick="toast('Tùy chọn tài chính')">
                    ⋮
                </button>

            </div>

            <div class="tabs finance-tabs">

                <button
                    type="button"
                    class="${financeTab==='overview'?'active':''}"
                    onclick="setFinanceTab('overview')">
                    Tổng quan
                </button>

                <button
                    type="button"
                    class="${financeTab==='income'?'active':''}"
                    onclick="setFinanceTab('income')">
                    Thu / Chi
                </button>

                <button
                    type="button"
                    class="${financeTab==='category'?'active':''}"
                    onclick="setFinanceTab('category')">
                    Danh mục
                </button>

            </div>

            ${
                financeTab==='overview'
                ?financeOverview()
                :financeTab==='income'
                ?financeIncome()
                :financeCategory()
            }

        </div>

    </div>`;
}

function setFinanceTab(tab){

    financeTab=tab;

    render();
}

function financeOverview(){

    return `
    <div class="asset">

        <small>
            Tổng tài sản　◉
        </small>

        <h2>${fmt(total())}</h2>

        <div class="change">
            ↑ +320.000đ (so với tháng trước)
        </div>

    </div>

    <div class="section-head">

        <h3>Các ví của tôi</h3>

        <button
            type="button"
            onclick="walletList()">
            + Tạo ví
        </button>

    </div>

    ${data.wallets.map(walletRow).join('')}

    <div class="section-head">

        <h3>Giao dịch gần đây</h3>

        <button
            type="button"
            onclick="txList()">
            Xem tất cả ›
        </button>

    </div>

    ${data.transactions.slice(0,3).map(txRow).join('')}

    <div class="section-head">
        <h3>Thao tác nhanh</h3>
    </div>

    <div class="quick-grid">

        <button
            type="button"
            class="quick"
            onclick="txModal('income')">

            <div class="qico">↗</div>
            <b>Thu</b>
            <small>Giao dịch</small>

        </button>

        <button
            type="button"
            class="quick"
            onclick="txModal('expense')">

            <div class="qico">↘</div>
            <b>Chi</b>
            <small>Giao dịch</small>

        </button>

        <button
            type="button"
            class="quick"
            onclick="transferModal()">

            <div class="qico">⇄</div>
            <b>Chuyển</b>
            <small>Giữa ví</small>

        </button>

        <button
            type="button"
            class="quick"
            onclick="stats()">

            <div class="qico">◔</div>
            <b>Thống kê</b>
            <small>Báo cáo</small>

        </button>

    </div>`;
}

function financeIncome(){

    let income=
        data.transactions
        .filter(t=>t.type==='income')
        .reduce((a,t)=>a+t.amount,0);

    let expense=
        data.transactions
        .filter(t=>t.type==='expense')
        .reduce((a,t)=>a+t.amount,0);

    return `
    <div class="asset">

        <small>Số dư hiện tại</small>

        <h2>${fmt(total())}</h2>

    </div>

    <div class="finance-summary">

        <div>
            <small>Thu nhập</small>
            <b class="green-t">${money(income)}</b>
        </div>

        <div>
            <small>Chi tiêu</small>
            <b class="red-t">${money(expense)}</b>
        </div>

        <div>
            <small>Chênh lệch</small>
            <b>${money(income-expense)}</b>
        </div>

    </div>

    <div class="section-head">

        <h3>Giao dịch gần đây</h3>

        <button
            type="button"
            onclick="txModal('income')">
            ＋ Thêm
        </button>

    </div>

    ${data.transactions.map(txRow).join('')}`;
}

function financeCategory(){

    return `
    <div class="section-head">

        <h3>Danh mục chi tiêu</h3>

        <button
            type="button"
            onclick="stats()">
            Thống kê ›
        </button>

    </div>

    <div class="chart-card">

        <div class="donut"></div>

        ${
            [
                ['Ăn uống',500000],
                ['Đi lại',250000],
                ['Học tập',187500],
                ['Giải trí',125000],
                ['Khác',187500]
            ]
            .map(
                x=>
                `<div class="legend-row">

                    <i class="legend-dot"></i>

                    <span style="flex:1">
                        ${x[0]}
                    </span>

                    <b>${money(x[1])}</b>

                </div>`
            )
            .join('')
        }

    </div>`;
}


/* =========================
   WALLET
========================= */

function walletRow(w){

    let pct=
        total()
        ?((w.balance/total())*100).toFixed(1)
        :0;

    return `
    <div
        class="wallet-row"
        onclick="walletDetail(${w.id})">

        <div class="wallet-icon ${w.cls}">
            ${w.icon}
        </div>

        <div class="wallet-main">

            <b>${esc(w.name)}</b>

            <small>${esc(w.sub)}</small>

        </div>

        <div class="wallet-money">

            <b>${fmt(w.balance)}</b>

            <small>(= ${pct}%)</small>

        </div>

    </div>`;
}


/* =========================
   GIAO DỊCH ROW
   ĐÃ THÊM SỬA / XÓA
========================= */

function txRow(t){

    let isTransfer=t.type==='transfer';

    return `
    <div class="tx-row">

        <div class="tx-icon">
            ${
                t.type==='income'
                ?'↗'
                :t.type==='expense'
                ?'●'
                :'⇄'
            }
        </div>

        <div class="tx-main">

            <b>${esc(t.name)}</b>

            <small>
                ${esc(wallet(t.wallet)?.name||'')}
                · ${esc(t.cat||'')}
            </small>

            <small>
                ${esc(t.date||'')}
                ${t.time?' · '+esc(t.time):''}
            </small>

        </div>

        <div class="tx-right">

            <div class="tx-amount ${t.type}">
                ${
                    t.type==='income'
                    ?'+'
                    :t.type==='expense'
                    ?'-'
                    :''
                }${money(t.amount)}
            </div>

            ${
                !isTransfer
                ?
                `<div class="tx-actions">

                    <button
                        type="button"
                        class="tx-edit-btn"
                        onclick="editTx(${t.id});event.stopPropagation()">
                        Sửa
                    </button>

                    <button
                        type="button"
                        class="tx-delete-btn"
                        onclick="deleteTx(${t.id});event.stopPropagation()">
                        Xóa
                    </button>

                </div>`
                :
                `<div class="tx-actions">

                    <button
                        type="button"
                        class="tx-delete-btn"
                        onclick="deleteTransfer(${t.id});event.stopPropagation()">
                        Xóa
                    </button>

                </div>`
            }

        </div>

    </div>`;
}


/* =========================
   WALLET
========================= */

function walletList(){

    openSheet(`

        <div class="close-row">

            <h3>Ví của tôi</h3>

            <button
                type="button"
                onclick="closeSheet()">
                ×
            </button>

        </div>

        <div class="asset">

            <small>Tổng tài sản　◉</small>

            <h2>${fmt(total())}</h2>

        </div>

        ${data.wallets.map(walletRow).join('')}

        <button
            type="button"
            class="primary full"
            style="margin-top:10px"
            onclick="closeSheet();walletModal()">
            ＋ Tạo ví mới
        </button>

    `);
}

function walletModal(){

    openSheet(`

        <div class="close-row">

            <h3>Tạo ví mới</h3>

            <button
                type="button"
                onclick="closeSheet()">
                ×
            </button>

        </div>

        <div class="field">

            <label>Tên ví</label>

            <input
                id="wname"
                placeholder="Ví dụ: Vietcombank, Tiền mặt...">

        </div>

        <div class="field">

            <label>Chọn biểu tượng</label>

            <div class="quick-grid">

                <button type="button" class="quick" onclick="pickIcon('🏦')">🏦</button>
                <button type="button" class="quick" onclick="pickIcon('▣')">▣</button>
                <button type="button" class="quick" onclick="pickIcon('▤')">▤</button>
                <button type="button" class="quick" onclick="pickIcon('💳')">💳</button>

            </div>

        </div>

        <div class="field">

            <label>Loại ví</label>

            <select id="wsub">

                <option>Ví tiền mặt</option>
                <option>Ví ngân hàng</option>
                <option>Ví điện tử</option>
                <option>Thẻ tín dụng</option>

            </select>

        </div>

        <div class="field">

            <label>Số dư ban đầu</label>

            <input
                id="wbal"
                type="number"
                placeholder="Nhập số tiền">

        </div>

        <button
            type="button"
            class="primary full"
            style="margin-top:15px"
            onclick="addWallet()">
            Tạo ví
        </button>

    `);
}

let picked='🏦';

function pickIcon(x){

    picked=x;

    toast('Đã chọn '+x);
}

function addWallet(){

    let n=
        document
        .getElementById('wname')
        ?.value
        .trim();

    if(!n)
        return toast('Nhập tên ví');

    data.wallets.push({

        id:Date.now(),

        name:n,

        sub:
            document
            .getElementById('wsub')
            .value,

        balance:
            +document
            .getElementById('wbal')
            .value||0,

        icon:picked,

        cls:'bank'

    });

    save();

    closeSheet();

    render();

    toast('Đã tạo ví');
}

function walletDetail(id){

    let w=wallet(id);

    if(!w)
        return;

    openSheet(`

        <div class="close-row">

            <button
                type="button"
                onclick="closeSheet()">
                ‹
            </button>

            <h3>Quản lý ví</h3>

            <button type="button">⋮</button>

        </div>

        <div class="detail-hero">

            <b>
                ${w.icon}
                ${esc(w.name)}　◉
            </b>

            <small>${esc(w.sub)}</small>

            <h2>${fmt(w.balance)}</h2>

        </div>

        <div class="icon-actions">

            <button
                type="button"
                class="icon-action"
                onclick="editWallet(${id})">

                <div class="circle-action">✎</div>
                Sửa

            </button>

            <button
                type="button"
                class="icon-action"
                onclick="txModal('income',${id})">

                <div class="circle-action">◉</div>
                Nạp tiền

            </button>

            <button
                type="button"
                class="icon-action"
                onclick="txModal('expense',${id})">

                <div class="circle-action">▣</div>
                Rút tiền

            </button>

            <button
                type="button"
                class="icon-action"
                onclick="deleteWallet(${id})">

                <div class="circle-action">♲</div>
                Xóa

            </button>

        </div>

        <h3 style="font-size:12px">
            Giao dịch gần đây
        </h3>

        ${
            data.transactions
            .filter(t=>t.wallet==id)
            .map(txRow)
            .join('')

            ||

            '<small>Chưa có giao dịch</small>'
        }

        <button
            type="button"
            class="primary full"
            onclick="closeSheet();txList()">
            ＋ Lịch sử giao dịch
        </button>

    `);
}

function editWallet(id){

    let w=wallet(id);

    if(!w)
        return;

    openSheet(`

        <div class="close-row">

            <h3>Sửa ví</h3>

            <button
                type="button"
                onclick="closeSheet()">
                ×
            </button>

        </div>

        <div class="field">

            <label>Tên ví</label>

            <input
                id="editWName"
                class="input"
                value="${esc(w.name)}">

        </div>

        <div class="field">

            <label>Loại ví</label>

            <select id="editWSub">

                <option ${w.sub==='Ví tiền mặt'?'selected':''}>
                    Ví tiền mặt
                </option>

                <option ${w.sub==='Ví ngân hàng'?'selected':''}>
                    Ví ngân hàng
                </option>

                <option ${w.sub==='Ví điện tử'?'selected':''}>
                    Ví điện tử
                </option>

                <option ${w.sub==='Thẻ tín dụng'?'selected':''}>
                    Thẻ tín dụng
                </option>

                ${
                    ![
                        'Ví tiền mặt',
                        'Ví ngân hàng',
                        'Ví điện tử',
                        'Thẻ tín dụng'
                    ].includes(w.sub)
                    ?`
                    <option selected>
                        ${esc(w.sub)}
                    </option>`
                    :''
                }

            </select>

        </div>

        <div class="field">

            <label>Biểu tượng</label>

            <div class="quick-grid">

                <button type="button" class="quick" onclick="setEditWalletIcon('🏦')">🏦</button>
                <button type="button" class="quick" onclick="setEditWalletIcon('▣')">▣</button>
                <button type="button" class="quick" onclick="setEditWalletIcon('▤')">▤</button>
                <button type="button" class="quick" onclick="setEditWalletIcon('💳')">💳</button>
                <button type="button" class="quick" onclick="setEditWalletIcon('💰')">💰</button>

            </div>

        </div>

        <input
            id="editWIcon"
            type="hidden"
            value="${esc(w.icon)}">

        <button
            type="button"
            class="primary full"
            style="margin-top:15px"
            onclick="saveWalletEdit(${id})">
            Lưu thay đổi
        </button>

    `);
}

function setEditWalletIcon(icon){

    document.getElementById('editWIcon').value=icon;

    toast('Đã chọn biểu tượng');
}

function saveWalletEdit(id){

    let w=wallet(id);

    if(!w)
        return;

    let n=
        document
        .getElementById('editWName')
        .value
        .trim();

    if(!n)
        return toast('Nhập tên ví');

    w.name=n;

    w.sub=
        document
        .getElementById('editWSub')
        .value;

    w.icon=
        document
        .getElementById('editWIcon')
        .value
        ||w.icon;

    save();

    closeSheet();

    render();

    toast('Đã cập nhật ví');
}

function deleteWallet(id){

    if(data.wallets.length<=1)
        return toast('Phải có ít nhất 1 ví');

    if(!confirm('Xóa ví này?'))
        return;

    data.wallets=
        data.wallets.filter(
            w=>w.id!=id
        );

    save();

    closeSheet();

    render();

    toast('Đã xóa ví');
}


/* =========================
   THÊM GIAO DỊCH
========================= */

function txModal(type='expense',walletId=null){

    selectedWalletForTx=walletId;

    openSheet(`

        <div class="close-row">

            <h3>Thêm giao dịch</h3>

            <button
                type="button"
                onclick="closeSheet()">
                ×
            </button>

        </div>

        <div class="seg">

            <button
                type="button"
                id="incomeBtn"
                class="${type==='income'?'active':''}"
                onclick="setTxType('income')">
                🟢 Thu
            </button>

            <button
                type="button"
                id="expenseBtn"
                class="${type==='expense'?'active':''}"
                onclick="setTxType('expense')">
                🔴 Chi
            </button>

        </div>

        <input
            id="txType"
            type="hidden"
            value="${type}">

        <div class="field">

            <label>Số tiền</label>

            <input
                id="txAmount"
                type="number"
                placeholder="Nhập số tiền">

        </div>

        <div class="field">

            <label>Danh mục</label>

            <select id="txCat">

                <option>Ăn uống</option>
                <option>Đi lại</option>
                <option>Học tập</option>
                <option>Giải trí</option>
                <option>Khác</option>

            </select>

        </div>

        <div class="field">

            <label>Ví</label>

            <select id="txWallet">

                ${
                    data.wallets.map(
                        w=>
                        `<option
                            value="${w.id}"
                            ${
                                String(selectedWalletForTx)===String(w.id)
                                ?'selected'
                                :''
                            }>

                            ${esc(w.name)}
                            · ${money(w.balance)}

                        </option>`
                    ).join('')
                }

            </select>

        </div>

        <div class="field">

            <label>Ngày</label>

            <input
                id="txDate"
                value="${dateKey(todayDate())}">

        </div>

        <div class="field">

            <label>Ghi chú (tùy chọn)</label>

            <textarea
                id="txNote"
                rows="3"
                placeholder="Nhập ghi chú..."></textarea>

        </div>

        <button
            type="button"
            class="primary green full"
            style="margin-top:15px"
            onclick="saveTx()">
            Lưu giao dịch
        </button>

    `);
}

function setTxType(t){

    document.getElementById('txType').value=t;

    document
        .getElementById('incomeBtn')
        .classList
        .toggle('active',t==='income');

    document
        .getElementById('expenseBtn')
        .classList
        .toggle('active',t==='expense');
}

function saveTx(){

    let type=
        document
        .getElementById('txType')
        .value;

    let amount=
        +document
        .getElementById('txAmount')
        .value||0;

    let w=
        wallet(
            document
            .getElementById('txWallet')
            .value
        );

    if(!amount)
        return toast('Nhập số tiền');

    if(!w)
        return toast('Không tìm thấy ví');

    if(
        type==='expense' &&
        w.balance<amount
    )
        return toast('Số dư không đủ');

    w.balance+=
        type==='income'
        ?amount
        :-amount;

    data.transactions.unshift({

        id:Date.now(),

        type,

        name:
            document
            .getElementById('txNote')
            .value
            ||
            document
            .getElementById('txCat')
            .value,

        cat:
            document
            .getElementById('txCat')
            .value,

        wallet:w.id,

        amount,

        date:
            document
            .getElementById('txDate')
            .value
            ||
            dateKey(todayDate()),

        time:
            new Date()
            .toLocaleTimeString(
                'vi-VN',
                {
                    hour:'2-digit',
                    minute:'2-digit'
                }
            )

    });

    save();

    closeSheet();

    render();

    toast('Đã lưu giao dịch');
}


/* =========================
   CHUYỂN TIỀN
========================= */

function transferModal(){

    openSheet(`

        <div class="close-row">

            <h3>Chuyển tiền giữa các ví</h3>

            <button
                type="button"
                onclick="closeSheet()">
                ×
            </button>

        </div>

        <div class="field">

            <label>Từ ví</label>

            <select id="fromWallet">

                ${
                    data.wallets.map(
                        w=>
                        `<option value="${w.id}">
                            ${esc(w.name)}
                            · ${money(w.balance)}
                        </option>`
                    ).join('')
                }

            </select>

        </div>

        <div class="field">

            <label>Đến ví</label>

            <select id="toWallet">

                ${
                    data.wallets.map(
                        w=>
                        `<option value="${w.id}">
                            ${esc(w.name)}
                            · ${money(w.balance)}
                        </option>`
                    ).join('')
                }

            </select>

        </div>

        <div class="field">

            <label>Số tiền</label>

            <input
                id="transferAmount"
                type="number"
                placeholder="Nhập số tiền">

        </div>

        <div class="field">

            <label>Ghi chú</label>

            <input
                id="transferNote"
                placeholder="Ví dụ: Chuyển tiền ăn uống">

        </div>

        <button
            type="button"
            class="primary full"
            style="margin-top:15px"
            onclick="doTransfer()">
            Xác nhận
        </button>

    `);
}

function doTransfer(){

    let a=
        +document
        .getElementById('transferAmount')
        .value;

    let from=
        wallet(
            document
            .getElementById('fromWallet')
            .value
        );

    let to=
        wallet(
            document
            .getElementById('toWallet')
            .value
        );

    if(!from||!to)
        return toast('Không tìm thấy ví');

    if(from.id===to.id)
        return toast('Chọn 2 ví khác nhau');

    if(!a||a>from.balance)
        return toast('Số tiền không hợp lệ');

    from.balance-=a;
    to.balance+=a;

    data.transactions.unshift({

        id:Date.now(),

        type:'transfer',

        name:
            document
            .getElementById('transferNote')
            .value
            ||
            'Chuyển khoản',

        cat:'Chuyển ví',

        wallet:from.id,

        fromWallet:from.id,
        toWallet:to.id,

        amount:a,

        date:dateKey(todayDate()),

        time:
            new Date()
            .toLocaleTimeString(
                'vi-VN',
                {
                    hour:'2-digit',
                    minute:'2-digit'
                }
            )

    });

    save();

    closeSheet();

    render();

    toast('Đã chuyển tiền');
}


/* =========================
   SỬA GIAO DỊCH
========================= */

function editTx(id){

    let t=data.transactions.find(x=>x.id==id);

    if(!t)
        return toast('Không tìm thấy giao dịch');

    if(t.type==='transfer')
        return toast('Giao dịch chuyển ví chưa hỗ trợ sửa');

    openSheet(`

        <div class="close-row">

            <h3>Sửa giao dịch</h3>

            <button
                type="button"
                onclick="closeSheet()">
                ×
            </button>

        </div>

        <div class="seg">

            <button
                type="button"
                id="editIncomeBtn"
                class="${t.type==='income'?'active':''}"
                onclick="setEditTxType('income')">
                🟢 Thu
            </button>

            <button
                type="button"
                id="editExpenseBtn"
                class="${t.type==='expense'?'active':''}"
                onclick="setEditTxType('expense')">
                🔴 Chi
            </button>

        </div>

        <input
            id="editTxType"
            type="hidden"
            value="${esc(t.type)}">

        <div class="field">

            <label>Số tiền</label>

            <input
                id="editTxAmount"
                class="input"
                type="number"
                value="${Number(t.amount)||0}">

        </div>

        <div class="field">

            <label>Danh mục</label>

            <select id="editTxCat">

                ${[
                    'Ăn uống',
                    'Đi lại',
                    'Học tập',
                    'Giải trí',
                    'Khác',
                    'Thu nhập'
                ].map(c=>
                    `<option
                        ${t.cat===c?'selected':''}>
                        ${c}
                    </option>`
                ).join('')}

            </select>

        </div>

        <div class="field">

            <label>Ví</label>

            <select id="editTxWallet">

                ${
                    data.wallets.map(w=>
                        `<option
                            value="${w.id}"
                            ${String(t.wallet)===String(w.id)?'selected':''}>
                            ${esc(w.name)}
                            · ${money(w.balance)}
                        </option>`
                    ).join('')
                }

            </select>

        </div>

        <div class="field">

            <label>Ngày</label>

            <input
                id="editTxDate"
                class="input"
                value="${esc(t.date||dateKey(todayDate()))}">

        </div>

        <div class="field">

            <label>Ghi chú</label>

            <textarea
                id="editTxNote"
                rows="3"
                placeholder="Nhập ghi chú...">${esc(t.name||'')}</textarea>

        </div>

        <button
            type="button"
            class="primary green full"
            style="margin-top:15px"
            onclick="updateTx(${id})">

            Lưu thay đổi

        </button>

        <button
            type="button"
            class="danger full"
            style="margin-top:8px"
            onclick="deleteTx(${id})">

            Xóa giao dịch

        </button>

    `);
}

function setEditTxType(type){

    document.getElementById('editTxType').value=type;

    document
        .getElementById('editIncomeBtn')
        .classList
        .toggle('active',type==='income');

    document
        .getElementById('editExpenseBtn')
        .classList
        .toggle('active',type==='expense');
}

function updateTx(id){

    let t=data.transactions.find(x=>x.id==id);

    if(!t)
        return toast('Không tìm thấy giao dịch');

    let oldWallet=wallet(t.wallet);

    let oldAmount=Number(t.amount)||0;

    if(!oldWallet)
        return toast('Không tìm thấy ví cũ');

    /* Hoàn lại ảnh hưởng cũ */

    if(t.type==='income')
        oldWallet.balance-=oldAmount;
    else
        oldWallet.balance+=oldAmount;

    let type=
        document
        .getElementById('editTxType')
        .value;

    let amount=
        +document
        .getElementById('editTxAmount')
        .value||0;

    let newWallet=
        wallet(
            document
            .getElementById('editTxWallet')
            .value
        );

    let cat=
        document
        .getElementById('editTxCat')
        .value;

    let date=
        document
        .getElementById('editTxDate')
        .value
        .trim()
        ||t.date;

    let note=
        document
        .getElementById('editTxNote')
        .value
        .trim()
        ||cat;

    if(!amount){

        /* hoàn lại dữ liệu cũ */

        if(t.type==='income')
            oldWallet.balance+=oldAmount;
        else
            oldWallet.balance-=oldAmount;

        return toast('Nhập số tiền');
    }

    if(!newWallet){

        if(t.type==='income')
            oldWallet.balance+=oldAmount;
        else
            oldWallet.balance-=oldAmount;

        return toast('Không tìm thấy ví mới');
    }

    /* Kiểm tra số dư nếu chuyển sang chi */

    if(
        type==='expense' &&
        newWallet.balance<amount
    ){

        if(t.type==='income')
            oldWallet.balance+=oldAmount;
        else
            oldWallet.balance-=oldAmount;

        return toast('Số dư ví mới không đủ');
    }

    /* Áp dụng giao dịch mới */

    if(type==='income')
        newWallet.balance+=amount;
    else
        newWallet.balance-=amount;

    t.type=type;
    t.amount=amount;
    t.wallet=newWallet.id;
    t.cat=cat;
    t.name=note;
    t.date=date;

    save();

    closeSheet();

    render();

    toast('Đã cập nhật giao dịch');
}

function deleteTx(id){

    let t=data.transactions.find(x=>x.id==id);

    if(!t)
        return toast('Không tìm thấy giao dịch');

    if(t.type==='transfer')
        return deleteTransfer(id);

    if(!confirm(`Xóa giao dịch "${t.name}"?`))
        return;

    let w=wallet(t.wallet);

    if(w){

        if(t.type==='income')
            w.balance-=Number(t.amount)||0;
        else
            w.balance+=Number(t.amount)||0;

    }

    data.transactions=
        data.transactions.filter(
            x=>x.id!=id
        );

    save();

    closeSheet();

    render();

    toast('Đã xóa giao dịch');
}


/* =========================
   XÓA CHUYỂN TIỀN
========================= */

function deleteTransfer(id){

    let t=data.transactions.find(x=>x.id==id);

    if(!t)
        return toast('Không tìm thấy giao dịch');

    if(t.type!=='transfer')
        return deleteTx(id);

    if(!confirm(`Xóa giao dịch "${t.name}"?`))
        return;

    let from=
        wallet(t.fromWallet||t.wallet);

    let to=
        wallet(t.toWallet);

    if(from)
        from.balance+=Number(t.amount)||0;

    if(to)
        to.balance-=Number(t.amount)||0;

    data.transactions=
        data.transactions.filter(
            x=>x.id!=id
        );

    save();

    closeSheet();

    render();

    toast('Đã xóa giao dịch chuyển ví');
}


/* =========================
   TRANSACTION LIST
========================= */

function txList(){

    openSheet(`

        <div class="close-row">

            <h3>Lịch sử giao dịch</h3>

            <button
                type="button"
                onclick="closeSheet()">
                ×
            </button>

        </div>

        <div class="tabs">

            <button
                type="button"
                class="active"
                onclick="filterTx('all',this)">
                Tất cả
            </button>

            <button
                type="button"
                onclick="filterTx('income',this)">
                Thu
            </button>

            <button
                type="button"
                onclick="filterTx('expense',this)">
                Chi
            </button>

        </div>

        <div id="txListBody">
            ${data.transactions.map(txRow).join('')}
        </div>

    `);
}

function filterTx(type,btn){

    document
        .querySelectorAll('.sheet .tabs button')
        .forEach(
            b=>b.classList.remove('active')
        );

    btn.classList.add('active');

    let list=
        type==='all'
        ?data.transactions
        :data.transactions.filter(
            t=>t.type===type
        );

    document
        .getElementById('txListBody')
        .innerHTML=
        list.map(txRow).join('')
        ||
        '<div class="empty">Không có giao dịch</div>';
}


/* =========================
   STATISTICS
========================= */

function stats(){

    openSheet(`

        <div class="close-row">

            <h3>Thống kê chi tiêu</h3>

            <button
                type="button"
                onclick="closeSheet()">
                ×
            </button>

        </div>

        <div class="subtabs">

            <button
                type="button"
                class="${statsTab==='category'?'active':''}"
                onclick="setStatsTab('category')">
                Theo danh mục
            </button>

            <button
                type="button"
                class="${statsTab==='wallet'?'active':''}"
                onclick="setStatsTab('wallet')">
                Theo ví
            </button>

        </div>

        ${
            statsTab==='category'
            ?statsByCategory()
            :statsByWallet()
        }

    `);
}

function setStatsTab(tab){

    statsTab=tab;

    stats();
}

function statsByCategory(){

    return `
    <div class="chart-card">

        <div
            style="
                display:flex;
                justify-content:space-between;
                font-size:10px;
                font-weight:700">

            ‹

            <span>Tháng 9/2026</span>

            ›

        </div>

        <div class="donut"></div>

        ${
            [
                ['Ăn uống',500000,'40%'],
                ['Đi lại',250000,'20%'],
                ['Học tập',187500,'15%'],
                ['Giải trí',125000,'10%'],
                ['Khác',187500,'15%']
            ]
            .map(
                x=>
                `<div class="legend-row">

                    <i class="legend-dot"></i>

                    <span style="flex:1">
                        ${x[0]}
                    </span>

                    <b>${money(x[1])}</b>

                    <span>${x[2]}</span>

                </div>`
            )
            .join('')
        }

    </div>

    <div class="chart-card">

        <h3 style="font-size:11px">
            Top chi tiêu
        </h3>

        ${
            [
                'Ăn uống',
                'Đi lại',
                'Học tập'
            ]
            .map(
                (x,i)=>
                `<div class="legend-row">

                    <span style="flex:1">${x}</span>

                    <b>
                        ${money(
                            [
                                500000,
                                250000,
                                187500
                            ][i]
                        )}
                    </b>

                </div>`
            )
            .join('')
        }

    </div>`;
}

function statsByWallet(){

    let rows=
        data.wallets
        .map(w=>{

            let totalSpent=
                data.transactions
                .filter(
                    t=>
                        t.wallet==w.id &&
                        t.type==='expense'
                )
                .reduce(
                    (a,t)=>a+t.amount,
                    0
                );

            return [w,totalSpent];

        })
        .sort(
            (a,b)=>b[1]-a[1]
        );

    return `
    <div class="chart-card">

        <div class="bar-list">

            ${
                rows.map(
                    ([w,n])=>
                    `<button
                        type="button"
                        class="bar-row"
                        onclick="walletDetail(${w.id})">

                        <div class="wallet-icon ${w.cls}">
                            ${w.icon}
                        </div>

                        <div class="grow">

                            <b>${esc(w.name)}</b>

                            <div class="bar-track">

                                <i
                                    style="
                                        width:${Math.min(
                                            100,
                                            n/5000
                                        )}%">
                                </i>

                            </div>

                        </div>

                        <b>${money(n)}</b>

                    </button>`
                ).join('')
            }

        </div>

    </div>

    <div class="chart-card">

        <h3 style="font-size:11px">
            Chi tiết theo ví
        </h3>

        ${
            rows.map(
                ([w,n])=>
                `<div class="legend-row">

                    <span style="flex:1">
                        ${esc(w.name)}
                    </span>

                    <b>${money(n)}</b>

                </div>`
            ).join('')
        }

    </div>`;
}


/* =========================
   SETTINGS
========================= */

function settings(){

    return `
    <div class="screen">

        <div class="top">
            <h1>Cài đặt</h1>
        </div>

        <div
            class="hello"
            style="
                display:flex;
                align-items:center;
                gap:10px">

            <div class="wallet-icon bank">
                T
            </div>

            <div>

                <b>Triển</b>

                <small>
                    Phiên bản 1.0.0
                </small>

            </div>

        </div>

        <div class="section-head">
            <h3>Ứng dụng</h3>
        </div>

        <div class="settings-row">

            <span>♧</span>

            <div class="grow">
                <b>Thông báo</b>
            </div>

            <button
                type="button"
                class="switch ${data.settings.notify?'on':''}"
                onclick="toggleSetting('notify')">

                <i></i>

            </button>

        </div>

        <div class="settings-row">

            <span>◐</span>

            <div class="grow">
                <b>Giao diện</b>
            </div>

            <button
                type="button"
                onclick="toggleSetting('dark')">

                ${data.settings.dark?'Tối':'Sáng'}　›

            </button>

        </div>

        <div class="settings-row">

            <span>◎</span>

            <div class="grow">
                <b>Ngôn ngữ</b>
            </div>

            <span style="font-size:9px">
                Tiếng Việt ›
            </span>

        </div>

        <div class="section-head">
            <h3>Dữ liệu</h3>
        </div>

        <div
            class="settings-row"
            onclick="exportData()">

            <span>⇩</span>

            <div class="grow">

                <b>
                    Sao lưu & Khôi phục
                </b>

            </div>

            <span>›</span>

        </div>

        <div
            class="settings-row"
            onclick="exportData()">

            <span>□</span>

            <div class="grow">

                <b>
                    Xuất dữ liệu
                </b>

            </div>

            <span>›</span>

        </div>

        <div class="settings-row">

            <span>ⓘ</span>

            <div class="grow">
                <b>Giới thiệu</b>
            </div>

            <span>›</span>

        </div>

    </div>`;
}

async function toggleSetting(k){

    if(
        k==='notify' &&
        !data.settings.notify &&
        'Notification' in window &&
        Notification.permission==='default'
    ){

        try{
            await Notification.requestPermission();
        }catch(e){}
    }

    data.settings[k]=!data.settings[k];

    save();

    render();

    toast(

        k==='dark'

        ?(
            data.settings.dark
            ?'Đã chuyển sang giao diện tối'
            :'Đã chuyển sang giao diện sáng'
        )

        :(
            data.settings.notify
            ?'Đã bật thông báo'
            :'Đã tắt thông báo'
        )
    );
}

function exportData(){

    let blob=
        new Blob(
            [
                JSON.stringify(
                    data,
                    null,
                    2
                )
            ],
            {
                type:'application/json'
            }
        );

    let a=
        document.createElement('a');

    a.href=
        URL.createObjectURL(blob);

    a.download=
        'trien-life-backup.json';

    a.click();

    URL.revokeObjectURL(a.href);

    toast('Đã xuất dữ liệu');
}

function resetAll(){

    if(!confirm(
        'Xóa toàn bộ dữ liệu và khôi phục mẫu?'
    ))
        return;

    data=
        structuredClone(
            defaultData
        );

    save();

    render();

    toast(
        'Đã khôi phục dữ liệu mẫu'
    );
}


/* =========================
   MODAL / TOAST
========================= */

function openSheet(html){

    document
        .getElementById('modalRoot')
        .innerHTML=`

        <div
            class="modal-backdrop"
            onclick="closeSheet()">

            <div
                class="sheet"
                onclick="event.stopPropagation()">

                <div class="grab"></div>

                ${html}

            </div>

        </div>`;
}

function closeSheet(){

    document
        .getElementById('modalRoot')
        .innerHTML='';
}

function toast(t){

    let x=
        document.getElementById('toast');

    if(!x)
        return;

    x.textContent=t;

    x.classList.add('show');

    clearTimeout(window.tt);

    window.tt=
        setTimeout(
            ()=>x.classList.remove('show'),
            1800
        );
}

function notify(title,body){

    if(
        'Notification' in window &&
        Notification.permission==='granted'
    ){

        new Notification(
            title,
            {
                body,
                icon:'./icon-192.png',
                tag:'trien-life'
            }
        );
    }
}


/* =========================
   START APP
========================= */

lastTodayKey=dateKey(todayDate());
scheduleDailyRefresh();
window.addEventListener('focus',updateForNewDay);
document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')
        updateForNewDay();
});

startReminderChecks();

if('serviceWorker' in navigator){

    window.addEventListener(
        'load',
        ()=>
            navigator.serviceWorker
            .register('./sw.js')
            .catch(
                err=>
                    console.error(
                        'Service Worker lỗi:',
                        err
                    )
            )
    );
}

render();
