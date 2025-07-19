import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt"; //to store passwords
import dotenv from "dotenv";
import session from "express-session";

const app = express();
const port = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const saltRounds = 10;

dotenv.config();

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 14, //2 weeks
        path: "/",
    }
}));
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

db.connect();

//function to get all tasks of the user in date-wise
async function getAllTasks(user_id) {
    let tasks = [];

    try {
        const allTasks = await db.query("SELECT * FROM tasks WHERE user_id = $1 ORDER BY deadline ASC", [user_id]);
        allTasks.rows.forEach(task => {
            tasks.push(task);
        });
    } catch (err) {
        console.error("Cannot retrieve info from the database" ,err.stack);
    }

    return tasks;
}

//Function to check authenticated or not (cookies):
function checkNotAuthenticated(req, res, next) {
    if (req.session.user_id) {
        return res.redirect("/tasks");
    }
    next();
}

function checkAuthenticated(req, res, next) {
    if (req.session.user_id) {return next();}
    res.redirect("/login");
}

//home page
app.get("/", checkNotAuthenticated, (req,res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

//registration page
app.get("/register", checkNotAuthenticated, (req,res) => {
    res.render("register.ejs", {username: "", password: ""});
});

//login page
app.get("/login", checkNotAuthenticated, (req,res) => {
    res.render("login.ejs", {username: "", password: ""});
});

//tasks page
app.get("/tasks", checkAuthenticated, async (req,res) => {
    try {
        const allTasks = await getAllTasks(req.session.user_id);
        res.render("tasks.ejs", {user_id: req.session.user_id, tasks: allTasks});
    } catch (err) {
        console.error("Error: ", err.stack);
    }
});

//logout
app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Logout Failed");
        }
        res.redirect("/login");
    })
})

//registering new user
app.post("/register", async (req,res) => {
    const username = req.body.username;
    const password = req.body.password;

    try {
        const userCheck = await db.query("SELECT * FROM users WHERE username = $1", [username]);

        if (userCheck.rows.length > 0) {
            res.render("register.ejs", {userExist: true, username: username, password: password});
        } else {
            bcrypt.hash(password, saltRounds, async (err, hash) => {
                if (err) {throw err;}
                const add = await db.query("INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *", [username, hash]);
                req.session.user_id = add.rows[0].id;
                res.redirect("/tasks");
            });
        }
    } catch (err) {console.error("Error: ", err.stack);}
});

//loging in new user
app.post("/login", async (req,res) => {
    const username = req.body.username;
    const password = req.body.password;

    try {
        const userCheck = await db.query("SELECT * FROM users WHERE username = $1", [username]);

        if (userCheck.rows.length === 0) {
            res.render("login.ejs", {userExist: false, username: username, password: password});
        } else {
            bcrypt.compare(password, userCheck.rows[0].password, (err, result) => {
                if (err) {throw err;}
                if (result) {
                    req.session.user_id = userCheck.rows[0].id;
                    res.redirect("/tasks");
                } else {
                    res.render("login.ejs", {passwordIncorrect: true, username: username, password: password});
                }
            });
        }
    } catch (err) {
        console.error("Error: ", err.stack);
    }
});

//ading new tasks
app.post("/newtask", async (req,res) => {
    const newTask = req.body.newTask;
    const user_id = req.query.user;
    const today = new Date();

    try {
        const addTask = await db.query("INSERT INTO tasks (user_id, task, deadline) VALUES ($1, $2, $3)", 
            [user_id, newTask, today.toISOString().split("T")[0]]
        );
        res.redirect(`/tasks`);
    } catch (err) {
        console.error("Error: ", err.stack);
    }
});

app.put("/edittask", async (req,res) => {
    const id = Number(req.body.id);
    const newTask = req.body.task;
    
    try {
        const update = await db.query("UPDATE tasks SET task = $1 WHERE id = $2", [newTask, id]);
        res.status(204).send();
    } catch(error) {
        console.error("Error: ", error.stack);
    }
});



//deleting completed tasks
app.delete("/", async (req,res) => {
    let id = Number(req.body.id);
    try {
        const update = await db.query("DELETE FROM tasks WHERE id = $1", [id]);
        res.send(204, "Success");
    } catch (err) {
        console.error("Error: ", err.stack);
        res.send(500);
    }
});

//permanently deleting a user:
app.delete("/deleteuser", async (req, res) => {
    const user_id = req.session.user_id;
    try {
        const delete_tasks = await db.query("DELETE FROM tasks WHERE user_id = $1", [user_id]);
        const delete_user = await db.query("DELETE FROM users WHERE id = $1", [user_id]);
        res.send(204, "Success");
    } catch (err) {
        res.status(500).send(err.message || "Internal Server Issue");
    }
});

app.listen(port, () => {
    console.log("Server running on 3000 port");
});