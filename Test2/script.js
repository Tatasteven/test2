// Array pentru stocarea datelor
let interactions = [];
let leads = [];
let reminders = [];
let teamMembers = [];
let activities = [];
let currentUser = null;
let currentClient = null;
// Obține userId-ul utilizatorului autentificat
function getUserId() {
    const authInstance = gapi.auth2.getAuthInstance();
    if (authInstance && authInstance.isSignedIn.get()) {
        return authInstance.currentUser.get().getId(); // Returnează ID-ul unic al utilizatorului
    }
    return null;
}async function saveDataToDrive(data) {
    const userId = getUserId();
    if (!userId) return;

    const fileName = `crm-data-${userId}.json`; // Numele fișierului este asociat cu userId
    const fileId = localStorage.getItem('driveFileId'); // ID-ul fișierului existent

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const metadata = {
        name: fileName, // Numele fișierului este specific pentru fiecare utilizator
        mimeType: 'application/json',
    };

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(data) +
        closeDelim;

    let request;
    if (fileId) {
        // Actualizează fișierul existent
        request = gapi.client.request({
            path: `/upload/drive/v3/files/${fileId}`,
            method: 'PATCH',
            params: { uploadType: 'multipart' },
            headers: {
                'Content-Type': `multipart/related; boundary="${boundary}"`,
            },
            body: multipartRequestBody,
        });
    } else {
        // Creează un fișier nou
        request = gapi.client.request({
            path: '/upload/drive/v3/files',
            method: 'POST',
            params: { uploadType: 'multipart' },
            headers: {
                'Content-Type': `multipart/related; boundary="${boundary}"`,
            },
            body: multipartRequestBody,
        });
    }

    try {
        const response = await request;
        localStorage.setItem('driveFileId', response.result.id); // Salvează ID-ul fișierului
        console.log('Date salvate în Google Drive:', response.result);
    } catch (error) {
        console.error('Eroare la salvarea datelor în Google Drive:', error);
    }
}async function loadDataFromDrive() {
    const userId = getUserId();
    if (!userId) return null;

    const fileName = `crm-data-${userId}.json`; // Numele fișierului este asociat cu userId

    // Caută fișierul în Google Drive
    const response = await gapi.client.drive.files.list({
        q: `name='${fileName}' and trashed=false`,
        fields: 'files(id)',
    });

    if (response.result.files.length === 0) {
        console.log('Nu există date salvate pentru acest utilizator.');
        return null;
    }

    const fileId = response.result.files[0].id;
    localStorage.setItem('driveFileId', fileId); // Salvează ID-ul fișierului

    // Încarcă conținutul fișierului
    const fileResponse = await gapi.client.drive.files.get({
        fileId,
        alt: 'media',
    });

    console.log('Date preluate din Google Drive:', fileResponse.result);
    return fileResponse.result;
}// Autentificare Google
function handleAuthClick() {
    gapi.auth2.getAuthInstance().signIn().then(() => {
        document.getElementById('loginModal').classList.add('hidden');
        document.querySelector('.container').classList.remove('hidden');
        loadData(); // Încarcă datele la logare
    }).catch(error => {
        console.error('Eroare la autentificare:', error);
    });
}
// Inițializează Google Drive API
function initGoogleDriveAPI() {
    gapi.load('client:auth2', async () => {
        try {
            await gapi.client.init({
                apiKey: 'AIzaSyCS6wi4tieXfGnWHcacL0HyEXXbe12703A', // API Key-ul tău
                clientId: '886708446597-7ijnmjmpnqbnskf4koj85qldgtnphj4o.apps.googleusercontent.com', // Client ID-ul tău
                clientSecret: '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', // Client Secret-ul tău
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                scope: 'https://www.googleapis.com/auth/drive.file',
            });

            // Atașează eveniment de autentificare
            const authButton = document.getElementById('google-auth-button');
            if (authButton) {
                authButton.onclick = handleAuthClick;
            }
        } catch (error) {
            console.error('Eroare la inițializarea Google Drive API:', error);
        }
    });
}

// Autentificare Google
function handleAuthClick() {
    gapi.auth2.getAuthInstance().signIn().then(() => {
        document.getElementById('loginModal').classList.add('hidden');
        document.querySelector('.container').classList.remove('hidden');
        loadData();
    }).catch(error => {
        console.error('Eroare la autentificare:', error);
    });
}

// Verifică dacă utilizatorul este autentificat
function checkAuth() {
    return gapi.auth2.getAuthInstance().isSignedIn.get();
}

// Delogare
function logout() {
    if (gapi.auth2) {
        const auth2 = gapi.auth2.getAuthInstance();
        if (auth2) {
            auth2.signOut().then(() => {
                console.log('Utilizatorul a fost delogat.');
            });
        }
    }

    // Resetare date locale
    currentUser = null;
    document.querySelector('.container').classList.add('hidden');
    document.getElementById('loginModal').classList.remove('hidden');
    alert('Te-ai delogat cu succes!');
}

// Încarcă datele din Google Drive
async function loadData() {
    if (!checkAuth()) return;

    const data = await loadDataFromDrive();
    if (data) {
        leads = data.leads || [];
        interactions = data.interactions || [];
        reminders = data.reminders || [];
        activities = data.activities || [];
    }
    updateLeadsTable();
    updateHomeTab();
    showCalendar();
}

// Salvează datele în Google Drive
async function saveData() {
    if (!checkAuth()) return;

    const data = { leads, interactions, reminders, activities };
    await saveDataToDrive(data);
}

// Salvează datele în Google Drive
async function saveDataToDrive(data) {
    const fileId = localStorage.getItem('driveFileId'); // ID-ul fișierului existent
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const metadata = {
        name: 'crm-data.json',
        mimeType: 'application/json',
    };

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(data) +
        closeDelim;

    let request;
    if (fileId) {
        // Actualizează fișierul existent
        request = gapi.client.request({
            path: `/upload/drive/v3/files/${fileId}`,
            method: 'PATCH',
            params: { uploadType: 'multipart' },
            headers: {
                'Content-Type': `multipart/related; boundary="${boundary}"`,
            },
            body: multipartRequestBody,
        });
    } else {
        // Creează un fișier nou
        request = gapi.client.request({
            path: '/upload/drive/v3/files',
            method: 'POST',
            params: { uploadType: 'multipart' },
            headers: {
                'Content-Type': `multipart/related; boundary="${boundary}"`,
            },
            body: multipartRequestBody,
        });
    }

    try {
        const response = await request;
        localStorage.setItem('driveFileId', response.result.id); // Salvează ID-ul fișierului
        console.log('Date salvate în Google Drive:', response.result);
    } catch (error) {
        console.error('Eroare la salvarea datelor în Google Drive:', error);
    }
}

// Preluează datele din Google Drive
async function loadDataFromDrive() {
    const fileId = localStorage.getItem('driveFileId');
    if (!fileId) return null;

    try {
        const response = await gapi.client.drive.files.get({
            fileId,
            alt: 'media',
        });
        console.log('Date preluate din Google Drive:', response.result);
        return response.result;
    } catch (error) {
        console.error('Eroare la preluarea datelor din Google Drive:', error);
        return null;
    }
}

// Deschide fereastra de autentificare
function openLoginModal() {
    document.getElementById('loginModal').classList.remove('hidden');
    document.getElementById('registerModal').classList.add('hidden');
}

// Deschide fereastra de înregistrare
function openRegisterModal() {
    document.getElementById('registerModal').classList.remove('hidden');
    document.getElementById('loginModal').classList.add('hidden');
}

// Înregistrare
document.getElementById('registerForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const newUsername = document.getElementById('newUsername')?.value;
    const newPassword = document.getElementById('newPassword')?.value;

    if (!newUsername || !newPassword) {
        alert('Completează toate câmpurile!');
        return;
    }

    const users = loadUsers();
    if (users.some(user => user.username === newUsername)) {
        alert('Utilizatorul există deja!');
        return;
    }

    users.push({ username: newUsername, password: newPassword });
    saveUsers(users);
    alert('Cont creat cu succes!');
    openLoginModal();
});

// Autentificare
document.getElementById('loginForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const username = document.getElementById('username')?.value;
    const password = document.getElementById('password')?.value;

    if (!username || !password) {
        alert('Completează toate câmpurile!');
        return;
    }

    const users = loadUsers();
    const user = users.find(user => user.username === username && user.password === password);

    if (user) {
        currentUser = user;
        document.getElementById('loginModal').classList.add('hidden');
        document.querySelector('.container').classList.remove('hidden');
        alert('Autentificare reușită!');
    } else {
        alert('Utilizator sau parolă incorectă!');
    }
});

// Funcții pentru Tab-uri
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        const tabContent = document.getElementById(tabId);
        if (tabContent) {
            tabContent.classList.add('active');
        }
    });
});

// Funcții pentru Adăugare Lead
function openAddLeadModal() {
    document.getElementById('addLeadModal').classList.remove('hidden');
}

function closeAddLeadModal() {
    document.getElementById('addLeadModal').classList.add('hidden');
}

document.getElementById('addLeadForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const nume = document.getElementById('nume')?.value;
    const prenume = document.getElementById('prenume')?.value;
    const telefon = document.getElementById('telefon')?.value;
    const email = document.getElementById('email')?.value;
    const interes = document.getElementById('interes')?.value;
    const detalii = document.getElementById('detalii')?.value;
    const sursaLead = document.getElementById('sursaLead')?.value;
    const campanie = document.getElementById('campanie')?.value;

    if (!nume || !prenume || !interes || !sursaLead) {
        alert('Completează toate câmpurile obligatorii!');
        return;
    }

    // Verifică duplicare
    if (leads.some(lead => lead.email === email || lead.telefon === telefon)) {
        alert('Acest email sau număr de telefon a fost deja introdus.');
        return;
    }

    const newLead = {
        nume,
        prenume,
        telefon,
        email,
        interes,
        detalii,
        sursaLead,
        campanie,
        status: 'Nou',
        dataAdaugarii: new Date().toLocaleString()
    };

    leads.push(newLead);
    activities.push({
        type: 'leadAdaugat',
        timestamp: new Date().toLocaleString(),
        details: { nume: `${nume} ${prenume}`, status: 'Nou' }
    });
    updateLeadsTable();
    updateHomeTab();
    closeAddLeadModal();
    saveData();

    // Resetare câmpuri
    document.getElementById('addLeadForm').reset();
});

// Funcții pentru Editare Lead
function openEditLeadModal(client) {
    const lead = leads.find(lead => `${lead.nume} ${lead.prenume}` === client);
    if (!lead) return;

    document.getElementById('editNume').value = lead.nume;
    document.getElementById('editPrenume').value = lead.prenume;
    document.getElementById('editTelefon').value = lead.telefon;
    document.getElementById('editEmail').value = lead.email;
    document.getElementById('editInteres').value = lead.interes;

    document.getElementById('editLeadModal').classList.remove('hidden');
}

function closeEditLeadModal() {
    document.getElementById('editLeadModal').classList.add('hidden');
}

document.getElementById('editLeadForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const nume = document.getElementById('editNume')?.value;
    const prenume = document.getElementById('editPrenume')?.value;
    const telefon = document.getElementById('editTelefon')?.value;
    const email = document.getElementById('editEmail')?.value;
    const interes = document.getElementById('editInteres')?.value;

    if (!nume || !prenume || !interes) {
        alert('Completează toate câmpurile obligatorii!');
        return;
    }

    const leadIndex = leads.findIndex(lead => `${lead.nume} ${lead.prenume}` === `${nume} ${prenume}`);
    if (leadIndex !== -1) {
        leads[leadIndex] = { ...leads[leadIndex], nume, prenume, telefon, email, interes };
        updateLeadsTable();
        saveData();
    }

    closeEditLeadModal();
});

// Funcții pentru Acțiuni
function openActionModal(client) {
    currentClient = client;
    document.getElementById('actionModal').classList.remove('hidden');
}

function closeActionModal() {
    document.getElementById('actionModal').classList.add('hidden');
}

function showActionFields() {
    const actionType = document.getElementById('actionType')?.value;
    const actionFields = document.getElementById('actionFields');
    if (!actionFields) return;

    let fieldsHTML = '';
    switch (actionType) {
        case 'apel':
        case 'email':
        case 'intalnire':
            fieldsHTML = '<input type="text" placeholder="Detalii">';
            break;
        case 'negociere':
            fieldsHTML = `
                <input type="text" placeholder="Bloc">
                <input type="text" placeholder="Apartament">
            `;
            break;
        case 'pierdut':
            fieldsHTML = '<input type="text" placeholder="Motiv">';
            break;
    }
    actionFields.innerHTML = fieldsHTML;
}

function saveAction() {
    const actionType = document.getElementById('actionType')?.value;
    const actionFields = document.getElementById('actionFields')?.querySelectorAll('input');
    if (!actionType || !actionFields) return;

    let details = '';
    switch (actionType) {
        case 'apel':
        case 'email':
        case 'intalnire':
            details = actionFields[0]?.value || '';
            break;
        case 'negociere':
            details = `Bloc: ${actionFields[0]?.value || ''}, Apartament: ${actionFields[1]?.value || ''}`;
            break;
        case 'pierdut':
            details = `Motiv: ${actionFields[0]?.value || ''}`;
            break;
    }

    interactions.push({
        client: currentClient,
        action: actionType,
        details: details,
        timestamp: new Date().toLocaleString()
    });

    activities.push({
        type: 'interactiune',
        timestamp: new Date().toLocaleString(),
        details: { client: currentClient, action: actionType, details: details }
    });

    updateStatus(currentClient);
    alert(`Acțiune salvată: ${actionType}\nDetalii: ${details}`);
    closeActionModal();
    updateHomeTab();
    saveData();
}

// Funcție pentru actualizarea statusului
function updateStatus(client) {
    const lead = leads.find(lead => `${lead.nume} ${lead.prenume}` === client);
    if (!lead) return;

    const clientInteractions = interactions.filter(interaction => interaction.client === client);

    if (clientInteractions.length === 0) {
        lead.status = 'Nou';
    } else {
        const lastInteraction = clientInteractions[clientInteractions.length - 1];
        if (lastInteraction.action === 'negociere') {
            lead.status = 'Negociere';
        } else if (lastInteraction.action === 'pierdut') {
            lead.status = 'Pierdut';
        } else {
            lead.status = 'Contactat';
        }
    }

    updateLeadsTable();
}

// Funcții pentru Reminder
function openReminderModal() {
    document.getElementById('reminderModal').classList.remove('hidden');
}

function closeReminderModal() {
    document.getElementById('reminderModal').classList.add('hidden');
}

function saveReminder() {
    const actionType = document.getElementById('reminderActionType')?.value;
    const dateTime = document.getElementById('reminderDateTime')?.value;

    if (!actionType || !dateTime) {
        alert('Completează toate câmpurile!');
        return;
    }

    reminders.push({
        client: currentClient,
        action: actionType,
        dateTime: new Date(dateTime).toLocaleString()
    });

    activities.push({
        type: 'reminder',
        timestamp: new Date().toLocaleString(),
        details: { client: currentClient, action: actionType, dateTime: new Date(dateTime).toLocaleString() }
    });

    alert(`Reminder salvat: ${actionType} la ${new Date(dateTime).toLocaleString()}`);
    closeReminderModal();
    updateHomeTab();
    saveData();
}

// Funcții pentru Filtrare și Căutare
function filterLeads() {
    const searchText = document.getElementById('search')?.value.toLowerCase() || '';
    const filterStatus = document.getElementById('filterStatus')?.value || '';
    const filterInteres = document.getElementById('filterInteres')?.value || '';

    const filteredLeads = leads.filter(lead => {
        const matchesSearch = (
            lead.nume.toLowerCase().includes(searchText) ||
            lead.prenume.toLowerCase().includes(searchText) ||
            lead.telefon.includes(searchText) ||
            lead.email.toLowerCase().includes(searchText)
        );
        const matchesStatus = filterStatus ? lead.status === filterStatus : true;
        const matchesInteres = filterInteres ? lead.interes === filterInteres : true;
        return matchesSearch && matchesStatus && matchesInteres;
    });

    updateLeadsTable(filteredLeads);
}

// Funcție pentru actualizarea tabelului de lead-uri
function updateLeadsTable(filteredLeads = leads) {
    const tbody = document.querySelector('#clientTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    filteredLeads.forEach(lead => {
        const row = `
            <tr data-client="${lead.nume} ${lead.prenume}">
                <td>${lead.status}</td>
                <td>${lead.nume}</td>
                <td>${lead.prenume}</td>
                <td>${lead.telefon}</td>
                <td>${lead.email}</td>
                <td>${lead.interes}</td>
                <td>${lead.dataAdaugarii}</td>
                <td>
                    <button class="edit-button" onclick="openEditLeadModal('${lead.nume} ${lead.prenume}')">✏️</button>
                    <button onclick="openActionModal('${lead.nume} ${lead.prenume}')">+</button>
                </td>
                <td>
                    <button onclick="openInteractionModal('${lead.nume} ${lead.prenume}')">👁️</button>
                </td>
                <td>
                    <button onclick="openReminderModal('${lead.nume} ${lead.prenume}')">⏰</button>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

// Funcție pentru afișarea activităților de astăzi
function updateHomeTab() {
    const activityDateInput = document.getElementById('activityDate');
    if (!activityDateInput) return;

    // Obține data selectată sau data curentă
    const selectedDate = activityDateInput.value || new Date().toISOString().split('T')[0];

    const todayActivities = document.getElementById('todayActivities');
    if (!todayActivities) return;

    // Golește conținutul existent
    todayActivities.innerHTML = '';

    // Filtrează activitățile pentru data selectată
    const filteredActivities = activities.filter(activity => {
        const activityDate = new Date(activity.timestamp).toISOString().split('T')[0];
        return activityDate === selectedDate;
    });

    // Afișează activitățile
    if (filteredActivities.length === 0) {
        todayActivities.innerHTML = '<li>Nu există activități pentru această dată.</li>';
    } else {
        filteredActivities.forEach(activity => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${activity.type}</strong> (${new Date(activity.timestamp).toLocaleTimeString()}):<br>
                ${activity.details ? JSON.stringify(activity.details) : ''}
            `;
            todayActivities.appendChild(li);
        });
    }
}

// Funcție pentru afișarea calendarului
function showCalendar() {
    const calendarView = document.getElementById('calendarView');
    if (!calendarView) return;

    calendarView.innerHTML = '';

    if (reminders.length === 0) {
        calendarView.innerHTML = '<p>Nu există remindere programate.</p>';
    } else {
        reminders.forEach(reminder => {
            const event = document.createElement('div');
            event.className = 'calendar-event';
            event.innerHTML = `
                <strong>${reminder.action}</strong> (${new Date(reminder.dateTime).toLocaleString()}):<br>
                ${reminder.details || ''}
            `;
            calendarView.appendChild(event);
        });
    }
}

// Funcție pentru schimbarea temei
function changeTheme() {
    const theme = document.getElementById('theme')?.value;
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
}

// Funcție pentru exportul datelor
function exportData() {
    const data = JSON.stringify({ leads, interactions, reminders, activities }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crm-data.json';
    a.click();
    URL.revokeObjectURL(url);
}

// Funcție pentru deschiderea ferestrei de interacțiuni
function openInteractionModal(client) {
    const interactionList = document.getElementById('interactionList');
    if (!interactionList) return;

    interactionList.innerHTML = '';

    // Afișează numele clientului
    const interactionClientName = document.getElementById('interactionClientName');
    if (interactionClientName) {
        interactionClientName.textContent = client;
    }

    // Filtrează interacțiunile pentru clientul selectat
    const clientInteractions = interactions.filter(interaction => interaction.client === client);

    if (clientInteractions.length === 0) {
        interactionList.innerHTML = '<tr><td colspan="3">Nu există interacțiuni pentru acest client.</td></tr>';
    } else {
        // Sortează interacțiunile după dată (cele mai recente primele)
        clientInteractions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        clientInteractions.forEach(interaction => {
            const row = `
                <tr>
                    <td>${interaction.action}</td>
                    <td>${new Date(interaction.timestamp).toLocaleString()}</td>
                    <td>${interaction.details || ''}</td>
                </tr>
            `;
            interactionList.insertAdjacentHTML('beforeend', row);
        });
    }

    const interactionModal = document.getElementById('interactionModal');
    if (interactionModal) {
        interactionModal.classList.remove('hidden');
    }
}

// Funcție pentru închiderea ferestrei de interacțiuni
function closeInteractionModal() {
    const interactionModal = document.getElementById('interactionModal');
    if (interactionModal) {
        interactionModal.classList.add('hidden');
    }
}

// Încarcă userii din LocalStorage
function loadUsers() {
    const savedUsers = localStorage.getItem('users');
    return savedUsers ? JSON.parse(savedUsers) : [];
}

// Salvează userii în LocalStorage
function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

// Inițializează aplicația
document.addEventListener('DOMContentLoaded', () => {
    initGoogleDriveAPI();
    loadData();
    updateHomeTab();
    showCalendar();
});