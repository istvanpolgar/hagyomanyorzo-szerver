//EXPRESS
const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//CORS POLICY
const cors = require('cors');
app.use(cors());

//FIREBASE DATABASE
const { initializeApp } = require('@firebase/app');
const { getDatabase, ref, set, onValue, child, get  } = require('@firebase/database');
const firebaseConfig = require('./src/firebaseConfig.js');
const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

//PORT
const port = process.env.PORT || 8080;

let fs = require('fs');

app.post('/', (req, res) => {
    let { name, category, event} = req.body;

    if(!name.includes(' '))
        res.send({
            message: "Adj meg rendes nevet!"
        });
    else 
        if(!category || !event)
            res.send({
                message: "Ne hagyj üresen mezőt!"
            });
        else {
            name= name.replace('.','');
            name= name.replace('#','');
            name= name.replace('$','');
            name= name.replace('[','');
            name= name.replace(']','');

            get(child(ref(getDatabase()), 'groups/' + event + '/' + name)).then((snapshot) => {
                if(snapshot.exists()) {
                    res.send({
                        message: "Már jelentkezett erre az előadásra vagy van valaki más, aki ezt a nevet használta. Kérem adja meg a nevét az apa kezdőbetűjével!"
                    });
                }
                else
                {
                    set(ref(database, 'groups/' + event +  '/' + name), {
                        class: category
                    });
                    res.send({
                        message: "Kedves " + name + " sikeresen jelentkeztél a(z) " + event + " eseményre!"
                    });
                }
            }).catch((error) => {
                res.send({
                    message: error
                });
            });
        }
});

app.post('/saveheadcount', (req, res) => {
    let { headcount } = req.body;

    set(ref(database, '/headcount'), {
        nr: headcount
    });
    res.send({
        message: "Létszám módosítva!"
    });
});

app.post('/classes', (req, res) => {  
    let classes = [];
    onValue(ref(database, '/classes'), (snapshot) => {
        snapshot.forEach(cat => {
            classes.push(cat.val());
        });
    }); 
    res.send({
        categories: classes
    });
});

app.post('/events', (req, res) => {  
    let events = [];

    onValue(ref(database, '/headcount/nr'), (snapshot) => {
        headcount = snapshot.val();
    });

    onValue(ref(database, '/events'), (snapshot) => {
        snapshot.forEach(ev => {
            onValue(ref(database, 'groups/' + ev.val()), (snap) => {
                if(snap.size <= headcount)
                    events.push(ev.val());
            });
        });
    }); 
    
    res.send({
        events: events
    });
});

app.post('/allevents', (req, res) => {  
    let allevents = [];
    let events = [];
    let students;
    onValue(ref(database, '/events'), (snapshot) => {
        snapshot.forEach(ev => {
            events.push(ev.val());
        });
    }); 

    events.forEach(ev => {
        onValue(ref(database, 'groups/' + ev), (snap) => {
            if(snap.val())
            {
                students = [];
                snap.forEach(st => {
                    students.push(st.key + ' - ' + st.val().class);
                });
                allevents.push({
                    title: ev,
                    students: students
                });
            }
        });
    });
    res.send({
        events: allevents
    });
});

app.post('/headcount', (req, res) => {  
    let headcount = 0;
    onValue(ref(database, '/headcount/nr'), (snapshot) => {
        headcount = snapshot.val();
    }); 
    res.send({
        headcount: headcount
    });
});

app.post('/admin', (req, res) => {  
    let { user, password } = req.body;
    if(user == 'adminIstvan' && password == 'Isacson93')
        res.send({
            ok: true
        });
    else
        res.send({
            message: "Helytelen adatokat adtál meg! Próbálkozz újra!"
        });
});

app.post('/download', (req, res) => {  
    let { events } = req.body;
    let text = "";
    let i;
    events.forEach(ev => {
        text = text + ev.title + '\n';
        i=1;
        ev.students.forEach(st => {
            text = text + i + '. ' + st + '\n';
            i++;
        })
        text = text + '\n\n';
    });
    
    try {
        if (!fs.existsSync('C://Hagyomanyorzo')) {
          fs.mkdirSync('C://Hagyomanyorzo');
        }
    } catch (err) {
        res.send({
            message: err.message
        });
    }

    fs.writeFile('C://Hagyomanyorzo/Hagyomanyorzo.txt', text, err => {
        if (err) {
            console.log(err);
            res.send({
                message: err.message
            });
        }
        else
        {
            res.send({
                message: "A fájl letöltve a C://Hagyomanyorzo mappába!"
            });
        }
      });
});

app.listen(port, () => {
    console.log(`Hagyomanyorzo app listening at http://localhost:${port}`);
})