const express = require('express');                                                         // Initializes express
const app = express();
app.use(express.json())                                                                     // Allows use of Json objects
app.set('view engine', 'ejs')                                                               // Allows display of ejs files
app.use(express.static('public'))
app.use('/css',express.static(__dirname + 'public/css'))
app.use('/assets',express.static(__dirname + 'public/assets'))
app.use('/js',express.static(__dirname + 'public/js'))

app.use(express.static('assets'))

const { Sequelize } = require('sequelize');                                                 // Initializes sequelize
const { users,stats } = require('./models')                                                 // Initializes models
//const sequelize = new Sequelize('postgres://jonathanbatalla@localhost:5432/postgres')     // Connects to database
//const sequelize = new Sequelize('postgres://postgres:testing1234xA@localhost:5432/backendBase')
const sequelize = new Sequelize('postgres://rory@localhost:5432/backendBase')  


const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: false }))

const bcrypt = require('bcrypt');                                                           // Imports package for enrypting passwords
const saltRounds = 10;
//------------------------------------------------------------------------------------------------------------------------
function lettersAndNumbersCheck(word){
    //return /^[A-Za-z0-9]*$/.test(str);
    if(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/.test(word)){
        console.log("this password contains both numbers and letters 8min 20max ")
        return true 
    }
    else{
        console.log("password was not good")
        return false
    }
    //^(?=.*[a-zA-Z])(?=.*[0-9])
}
function lengthCheck(item, minLength, maxLength){                                           // checks the length of what is passed in
    let itemLength = item.length;
    if(itemLength < minLength){
        console.log(item+" is too short")
        return false
    }
    else if(itemLength > maxLength){
        console.log(item+" is too long")
        return false
    }
    else{
        return true
    }
}
function lettersOnly(word){
    if (!/[^a-zA-Z]/.test(word)){
        return true
    }
    else{
        return false
    }
}
function validateEmail(mail){
    if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail)&&lengthCheck(mail,5,30)==true){          //checks to make sure email is valid and long enough
        return (true)
    }
    else{
        return (false)
    }
}

//----------------------------------------------------------
function getStats(){
    agents = ['Fade','Neon','Chamber','Skye','Yoru','Astra','KAYO','Phoenix','Raze',       // List of all Valorant Agents
    'Brimstone','Jett','Sage','Viper','Breach','Cypeher','Sova','Omen','Reyna','Killjoy']
    
    guns = ['Operator','Vandal','Phantom','Classic','Judge','Marshall','Odin','Sheriff',    // List of all Valorant guns
    'Spectre','Ares','Bulldog','Frenzy','Ghost','Guardian','Bucky','Knife','Shorty','Stinger']

    rank = ['Iron','Bronze','Silver','Gold','Platinum','Diamond','Ascendant','Immortal']   //List of all Valorant ranks

    userstats = {                                                                           // Generate random stats for user
    agent: agents[Math.floor(Math.random()*20)],
    gun: guns[Math.floor(Math.random()*19)],
    rank: rank[Math.floor(Math.random()*10)] + ' ' + Math.ceil(Math.random()*3),
    kd: (Math.random()*3).toFixed(2),
    winRate: Math.floor(Math.random()*101)
    }

    return userstats                                                                        // return stats as an object
}
//------------------------------------------------------------------------------------------------------------------------
app.get('/register', (req, res)=> {                                                         // Renders Register Page
    res.render("register",{msg:'Join the battle'})                                                    // Renders register.ejs
})
//----------------------------------------------------------
app.post('/registerUser', async (req, res) => {                                              // Creates user in users table
    let userExists = await users.findAll({
        where: {
            username: req.body.username
        }
    })
    if (Object.keys(userExists).length != 0) {                                               // Checks if username exist
        res.render('register',{msg:'User already exist'})
    }
    else {
        let userExists = await users.findAll({
            where: {
                email: req.body.email
            }
        })
       
        if(Object.keys(userExists).length != 0 || validateEmail(req.body.email)==false) {      // Checks if email exist & checks to see if it is a valid email
            if(validateEmail(req.body.email)==false){
                res.render('register',{msg:'Email must be > 5 char < 24 char long and have @ symbol.'})}
            else{
                res.render('register',{msg:'Email already exist'})}
        }
        else if(lettersOnly(req.body.firstname)==false||lettersOnly(req.body.lastname)==false||lettersOnly(req.body.username)==false){      
            res.render('register',{msg:"Use only letters in first name,last name and username"})
        }
        else if(lengthCheck(req.body.firstname)==false||lengthCheck(req.body.lastname)==false||lengthCheck(req.body.username)==false){
            res.render('register',{msg:"First name,last name and username must be between 2 and 15."})
        }
        else if(lengthCheck(req.body.password,8,20)==false){ //password length check min 8 max 20
            res.render('register',{msg:"Password must be greater than characters 8 and less than 20."})
        }
        else if(lettersAndNumbersCheck(req.body.password)==false){
            res.render('register',{msg:"Password must contain both letters and numbers."})
        }
        else {
            const hashedPassword = await bcrypt.hash(req.body.password, saltRounds)                   // Hashes user password for database
            await users.create({                                                              // Creates instance in users table
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                username: req.body.username,
                password: hashedPassword,
                email: req.body.email,
            })
    
            userstats = getStats()                                                             
            userstats['username'] = req.body.username
        
            await stats.create(userstats)                                                   // Creates instance in stats table
    
            res.redirect('/login')                                                          // redirects to /login
        }   
    } 
    
})
//----------------------------------------------------------
app.get('/login', async(req, res)=> {                                                        // Renders Login Page
    res.render("login")                                                                      // Renders login.ejs
})
//----------------------------------------------------------
app.post('/check', async (req,res) => {                                                     // Called from login.ejs
   
    let loggedUser = await users.findOne({
        where: {
            username: req.body.username,
        }
    })
 
    if (loggedUser == null) {                                                               // Checks if user and pass are correct
        res.render('login',{msg:'User does not exist'})
    } 

    try {
        if(await bcrypt.compare(req.body.password, loggedUser.password)) {                  //Checks password from dataBase
          res.redirect('/stats/' + req.body.username)                                       //Redirects to stats/(username of user)

        } else {
          res.send('Not Allowed')
        }
      } 
      catch {
        res.status(500).send()
    }
})
//----------------------------------------------------------
app.get('/stats/:username', async (req, res) => {                                           // Renders Stats Page
    let player = await stats.findOne({
        where: {
            username: req.params.username
        }
    })
  
    res.render("stats",{user: player})                                                      // Renders stats.ejs and sends stats from database to stats.ejs
})
//------------------------------------------------------------------------------------------------------------------------

app.listen(3000, console.log('Server running on port 3000'))
