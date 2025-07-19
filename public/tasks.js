//keeping track of totalTasks for styling purposes
let totalTasks = Number("<%= tasks.length %> ");
if (totalTasks === 0) {
    document.querySelector("#all-tasks > form").style.marginTop = "0.25rem";
}

//function to delete completed tasks
async function taskcompleted(Id) {
    const div = document.querySelector(`#div-${Id}`);
    const hr = document.querySelector(`#hr-${Id}`);

    div.classList.add("fade-off");
    hr.classList.add("fade-off");

    div.addEventListener('animationend', () => {
        div.classList.add("hide");
        hr.classList.add("hide");
    });

    try {
        const update = await fetch("/deletetask", {
            method: "DELETE",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: Id
            })
        });
        totalTasks--;
        if (totalTasks === 0) {
            document.querySelector("#all-tasks > form").style.marginTop = "0.25rem";
        }

        console.log("Updated Successfully");
    } catch(err) {
        alert("Unable to connect to server");
        console.error("Error!", err.stack);
    } 
}

//functions to edit tasks
document.querySelectorAll("span.edit").forEach(item => {
    item.addEventListener("click", (event) => {
        const Id = Number(event.target.id.split("-")[1]);
        const div = document.getElementById(`div-${Id}`);
        const label = document.querySelector(`#div-${Id} > label`);
        const edit_div = document.getElementById(`edit-div-${Id}`);
        const edit_input = document.getElementById(`edit-input-${Id}`);

        const prevTask = label.innerText.trim();

        div.classList.add("hide");
        edit_div.classList.remove("hide");

        edit_input.value = prevTask;

        edit_input.focus();
    });
});

document.querySelectorAll("span.check").forEach(item => {
    item.addEventListener("click", async (event) => {
        const Id = Number(event.target.id.split("-")[1]);
        const div = document.getElementById(`div-${Id}`);
        const label = document.querySelector(`#div-${Id} > label`);
        const edit_div = document.getElementById(`edit-div-${Id}`);
        const edit_input = document.getElementById(`edit-input-${Id}`);

        const newTask = edit_input.value;
        label.innerHTML = newTask;

        div.classList.remove("hide");
        edit_div.classList.add("hide");

        try {
            const data_update = await fetch("/edittask", {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: Id,
                    task: newTask,
                })
            });
        } catch(error) {
            alert("Unable to Connect to Server");
            console.error("Error: ", error.stack);
        }
    });
});

//function to check if any popup is open, if it is then new popup wont open
function popup_open() {
    return document.getElementById("logout-popup") || document.getElementById("delete-popup") || document.getElementById("edittask-popup");
}

//adding new task
document.querySelector("#newtask > span.add").addEventListener("click", async () => {
    if (popup_open()) {return;}
    const newtask_popup = await fetch("/newtaskpopup");
    const html = await newtask_popup.text();

    document.body.insertAdjacentHTML("afterbegin", html);
    document.getElementById("container").style.opacity = "0.3";

    //setting limits on date
    const today = new Date();
    const date = String(today.getDate()).padStart(2, "0");
    const month = String((today.getMonth()+1)).padStart(2, "0");
    const year = today.getFullYear();

    const formattedDate = `${year}-${month}-${date}`;

    const date_input = document.getElementById("date");
    date_input.value = formattedDate;
    date_input.setAttribute("min", formattedDate);

    //dynamic textarea
    const textarea = document.querySelector("textarea#task")
    textarea.addEventListener("input", () => {
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
    });

    //cancel button
    document.getElementById("cancel-newtask").addEventListener("click", () => {
        document.getElementById("edittask-popup").remove();
        document.getElementById("container").style.opacity = "1";
    });
});

//function for the settings button:
document.querySelector("div#settings > span").addEventListener("click", () => {
    svg = document.querySelector("div#settings > span");
    button_div = document.getElementById("settings-opt");

    svg.classList.toggle("rotate");
    button_div.classList.toggle("slide-in");
});

//function for logout button:
document.getElementById("logout").addEventListener("click", async () => {
    if (popup_open()) {return;}

    const logout_popup = await fetch("/logoutpopup");
    const html = await logout_popup.text();

    document.body.insertAdjacentHTML('afterbegin', html)
    document.getElementById("container").style.opacity = "0.3";

    document.getElementById("cancel-logout").addEventListener("click", () => {
        document.getElementById("logout-popup").remove();
        document.getElementById("container").style.opacity = "1";
    });

});

//function for deleting user permanently
document.getElementById("delete-user").addEventListener("click", async () => {
    if (popup_open()) {return;}

    const delete_user_popup = await fetch("/deleteuserpopup");
    const html = await delete_user_popup.text();

    document.body.insertAdjacentHTML("afterbegin", html);
    document.getElementById("container").style.opacity = "0.3";

    document.getElementById("cancel-delete").addEventListener("click", () => {
        document.getElementById("delete-popup").remove();
        document.getElementById("container").style.opacity = "1";
    });

    document.getElementById("do-delete").addEventListener("click", async () => {
        try {
            const result = await fetch("/deleteuser", {
                method: "DELETE",
                credentials: "include",
            });
            window.location.href = "/register";
        } catch (err) {
            console.error("Error: ", err.stack);
        }
    });

});