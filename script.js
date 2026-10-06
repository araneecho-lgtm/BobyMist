/* ==========================================================================
   Body Scent — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : #filter-bar, #product-list
   - order.html   : #orderForm, #customerName, #contact, #items, #total, #note
   - admin.html   : #ordersTable tbody
   แต่ละส่วนจะทำงานเฉพาะเมื่อหน้านั้นมี element ของตัวเองอยู่
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     ค่าตั้งต้น
     ------------------------------------------------------------------------ */
  var PRODUCTS_URL = 'products.json';

  var ORDER_ENDPOINT =
    'https://script.google.com/macros/s/AKfycbxnzmkqYpttLBktF3Ki4VN1-Y7F1ckNV1R9Sp6vzbByzzzkkMUY1ZBEB70ObppOAurD/exec';

  var ORDERS_CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vRnhnrpH1-Xr1ejNSLiAirvwQ-37e9RAzgfKPzf-omNytVDaH-eMyiwi5cKvmu0B-txYAky4Dauwi2H/pub?gid=0&single=true&output=csv';

  var MOODS = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'fresh', label: 'Fresh' },
    { key: 'sweet', label: 'Sweet' },
    { key: 'confident', label: 'Confident' },
    { key: 'romance', label: 'Romance' }
  ];

  var TYPE_LABELS = { spray: 'น้ำหอมฉีดตัว', rollon: 'โรลออน' };

  /* ------------------------------------------------------------------------
     ตัวช่วยทั่วไป
     ------------------------------------------------------------------------ */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function formatPrice(value) {
    var n = Number(value);
    return isNaN(n) ? String(value) : n.toLocaleString('th-TH');
  }

  function moodLabel(key) {
    for (var i = 0; i < MOODS.length; i++) {
      if (MOODS[i].key === key) return MOODS[i].label;
    }
    return key;
  }

  /* ========================================================================
     1) หน้า product.html — การ์ดสินค้า + ปุ่มกรอง mood
     ======================================================================== */
  function initProducts() {
    var filterBar = document.getElementById('filter-bar');
    var list = document.getElementById('product-list');
    if (!filterBar || !list) return;

    var products = [];
    var currentMood = 'all';

    /* mood เริ่มต้นจาก ?mood=xxx (ถ้าไม่ถูกต้องให้แสดงทั้งหมด) */
    var paramMood = (new URLSearchParams(window.location.search).get('mood') || '').toLowerCase();
    if (MOODS.some(function (m) { return m.key === paramMood; })) {
      currentMood = paramMood;
    }

    function buildFilterBar() {
      filterBar.textContent = '';
      MOODS.forEach(function (m) {
        var btn = el('button', 'filter-btn', m.label);
        btn.type = 'button';
        btn.dataset.mood = m.key;
        btn.setAttribute('aria-pressed', String(m.key === currentMood));
        if (m.key === currentMood) btn.classList.add('is-active');
        btn.addEventListener('click', function () { setMood(m.key); });
        filterBar.appendChild(btn);
      });
    }

    function setMood(key) {
      currentMood = key;
      Array.prototype.forEach.call(filterBar.querySelectorAll('.filter-btn'), function (btn) {
        var active = btn.dataset.mood === key;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });

      /* อัปเดต URL ให้แชร์ลิงก์ที่กรองแล้วได้ โดยไม่โหลดหน้าใหม่ */
      if (window.history && window.history.replaceState) {
        var url = new URL(window.location.href);
        if (key === 'all') url.searchParams.delete('mood');
        else url.searchParams.set('mood', key);
        window.history.replaceState(null, '', url);
      }
      render();
    }

    function buildCard(p) {
      var card = el('article', 'product-card');
      card.dataset.mood = p.mood;

      var media = el('div', 'product-card__media');
      var img = el('img');
      img.src = p.image;
      img.alt = p.name;
      img.loading = 'lazy';
      media.appendChild(img);

      var body = el('div', 'product-card__body');

      var mood = el('div', 'product-card__mood mood-label');
      mood.appendChild(el('span', 'mood-dot'));
      mood.appendChild(document.createTextNode(moodLabel(p.mood)));

      var title = el('h3', 'product-card__title', p.name);

      var metaText = p.size ? p.size : (TYPE_LABELS[p.type] || '');
      var meta = el('p', 'product-card__meta', metaText);

      var footer = el('div', 'product-card__footer');
      var price = el('span', 'price', formatPrice(p.price));
      price.appendChild(el('small', null, 'บาท'));

      /* ชื่อที่ส่งไปหน้าสั่งซื้อ: ชื่อสินค้า + ไซส์ (ถ้ามี) */
      var itemName = p.size ? p.name + ' ' + p.size : p.name;
      var params = new URLSearchParams();
      params.set('item', itemName);
      params.set('price', String(p.price));

      var buy = el('a', 'btn btn--accent', 'สั่งซื้อ');
      buy.href = 'order.html?' + params.toString();

      footer.appendChild(price);
      footer.appendChild(buy);

      body.appendChild(mood);
      body.appendChild(title);
      body.appendChild(meta);
      body.appendChild(footer);

      card.appendChild(media);
      card.appendChild(body);
      return card;
    }

    function render() {
      list.textContent = '';
      var shown = products.filter(function (p) {
        return currentMood === 'all' || p.mood === currentMood;
      });

      if (!shown.length) {
        list.appendChild(el('p', 'text-muted', 'ไม่พบสินค้าในหมวดนี้'));
        return;
      }
      shown.forEach(function (p) { list.appendChild(buildCard(p)); });
    }

    buildFilterBar();
    list.appendChild(el('p', 'text-muted', 'กำลังโหลดสินค้า...'));

    fetch(PRODUCTS_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        products = data;
        render();
      })
      .catch(function (error) {
        console.error(error);
        list.textContent = '';
        list.appendChild(el('p', 'text-muted', 'โหลดข้อมูลสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'));
      });
  }

  /* ========================================================================
     2) หน้า order.html — เติมฟอร์มอัตโนมัติ + ส่งคำสั่งซื้อ
     ======================================================================== */
  function initOrder() {
    var form = document.getElementById('orderForm');
    if (!form) return;

    var itemsInput = document.getElementById('items');
    var totalInput = document.getElementById('total');

    /* เติมชื่อสินค้าและราคาจาก URL parameter ทันทีที่โหลดหน้า */
    var params = new URLSearchParams(window.location.search);
    var item = params.get('item');
    var price = params.get('price');

    if (item !== null && itemsInput) itemsInput.value = item;
    if (price !== null && totalInput) totalInput.value = price;

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;

      function val(id) {
        var node = document.getElementById(id);
        return node ? node.value.trim() : '';
      }

      var payload = {
        customerName: val('customerName'),
        contact: val('contact'),
        items: val('items'),
        total: val('total'),
        note: val('note')
      };

      if (!payload.customerName || !payload.contact || !payload.items || !payload.total) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
      }

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch(ORDER_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
        .then(() => { window.location.href = 'thankyou.html'; })
        .catch(error => {
          console.error(error);
          alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  /* ========================================================================
     3) หน้า admin.html — ตารางคำสั่งซื้อจาก Google Sheet (CSV)
     ======================================================================== */

  /* parse CSV เอง: รองรับเครื่องหมายคำพูด, "" ที่อยู่ในช่อง, คอมมาและขึ้นบรรทัดใหม่ในช่อง */
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;

    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); /* ตัด BOM */

    for (var i = 0; i < text.length; i++) {
      var ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }

    /* แถวสุดท้ายที่ไม่มี newline ปิดท้าย */
    if (field !== '' || row.length) {
      row.push(field);
      rows.push(row);
    }

    /* ตัดแถวว่าง */
    return rows.filter(function (r) {
      return r.some(function (c) { return c.trim() !== ''; });
    });
  }

  function initAdmin() {
    var tbody = document.querySelector('#ordersTable tbody');
    if (!tbody) return;

    var COLS = 6; /* วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, ยอดรวม, หมายเหตุ */
    var LABELS = ['วันเวลา', 'ชื่อลูกค้า', 'เบอร์โทร/Line', 'รายการสินค้า', 'ยอดรวม', 'หมายเหตุ'];

    function messageRow(text) {
      tbody.textContent = '';
      var tr = el('tr');
      var td = el('td', 'text-muted', text);
      td.colSpan = COLS;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    messageRow('กำลังโหลดข้อมูล...');

    /* เติม t กัน browser เก็บแคชไฟล์ CSV เก่า */
    var url = ORDERS_CSV_URL + '&t=' + Date.now();

    fetch(url, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        var rows = parseCSV(text);
        rows.shift(); /* แถวแรกคือหัวคอลัมน์ */

        if (!rows.length) {
          messageRow('ยังไม่มีรายการสั่งซื้อ');
          return;
        }

        /* Sheet เพิ่มแถวใหม่ต่อท้ายเสมอ จึงกลับลำดับให้ล่าสุดขึ้นก่อน */
        rows.reverse();

        tbody.textContent = '';
        rows.forEach(function (r) {
          var tr = el('tr');
          for (var c = 0; c < COLS; c++) {
            var value = r[c] !== undefined ? r[c] : '';
            if (c === 4 && value !== '' && !isNaN(Number(value))) {
              value = formatPrice(value) + ' บาท';
            }
            var td = el('td', null, value); /* textContent กัน HTML ที่ลูกค้ากรอกมา */
            td.dataset.label = LABELS[c];
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        });
      })
      .catch(function (error) {
        console.error(error);
        messageRow('โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง');
      });
  }

  /* ------------------------------------------------------------------------
     เริ่มทำงาน
     ------------------------------------------------------------------------ */
  function init() {
    initProducts();
    initOrder();
    initAdmin();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
