const ALLOWED_STATUSES = [
  'PENDING',
  'PAYMENT_COMPLETED',
  'PAYMENT_FAILED',
  'INVENTORY_RESERVED',
  'INVENTORY_FAILED',
  'CONFIRMED',
  'FAILED',
];

const form = document.getElementById('create-order-form');
const createMessage = document.getElementById('create-message');
const ordersBody = document.getElementById('orders-body');
const ordersEmpty = document.getElementById('orders-empty');
const ordersTableWrap = document.getElementById('orders-table-wrap');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = {
    productId: formData.get('productId').trim(),
    quantity: Number(formData.get('quantity')),
    customerEmail: formData.get('customerEmail').trim(),
  };

  try {
    const response = await fetch('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      showMessage(data.error || 'Failed to create order', 'error');
      return;
    }

    form.reset();
    form.quantity.value = 1;
    showMessage(`Order ${data.id.slice(0, 8)}... created with status ${data.status}.`, 'success');
    await loadOrders();
  } catch (err) {
    showMessage('Network error while creating order.', 'error');
  }
});

async function loadOrders() {
  try {
    const response = await fetch('/orders');
    const orders = await response.json();
    renderOrders(orders);
  } catch (err) {
    showMessage('Failed to load orders.', 'error');
  }
}

function renderOrders(orders) {
  ordersBody.innerHTML = '';

  const hasOrders = orders.length > 0;
  ordersEmpty.hidden = hasOrders;
  ordersTableWrap.hidden = !hasOrders;

  for (const order of orders) {
    const row = document.createElement('tr');

    row.appendChild(td(order.id, 'order-id'));
    row.appendChild(td(order.product_id));
    row.appendChild(td(String(order.quantity)));
    row.appendChild(td(order.customer_email));
    row.appendChild(td(badge(order.status)));
    row.appendChild(td(formatDate(order.created_at)));
    row.appendChild(td(statusControls(order)));

    ordersBody.appendChild(row);
  }
}

function td(text, className) {
  const cell = document.createElement('td');
  cell.textContent = text;
  if (className) cell.className = className;
  return cell;
}

function badge(status) {
  const span = document.createElement('span');
  span.className = 'status-badge';
  if (status === 'CONFIRMED') span.classList.add('terminal');
  if (status === 'FAILED' || status.endsWith('_FAILED')) span.classList.add('failed');
  span.textContent = status;
  return span;
}

function statusControls(order) {
  const wrapper = document.createElement('div');

  const select = document.createElement('select');
  select.className = 'status-select';
  for (const status of ALLOWED_STATUSES) {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    if (status === order.status) option.selected = true;
    select.appendChild(option);
  }

  const button = document.createElement('button');
  button.className = 'update-btn';
  button.textContent = 'Update';
  button.addEventListener('click', () => updateStatus(order.id, select.value, button));

  wrapper.appendChild(select);
  wrapper.appendChild(button);
  return wrapper;
}

async function updateStatus(id, status, button) {
  button.disabled = true;
  try {
    const response = await fetch(`/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();
    if (!response.ok) {
      alert(data.error || 'Failed to update status');
    } else {
      await loadOrders();
    }
  } catch (err) {
    alert('Network error while updating status.');
  } finally {
    button.disabled = false;
  }
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return isNaN(date.getTime()) ? isoString : date.toLocaleString();
}

function showMessage(text, type) {
  createMessage.textContent = text;
  createMessage.className = `message ${type}`;
  createMessage.hidden = false;
}

loadOrders();
