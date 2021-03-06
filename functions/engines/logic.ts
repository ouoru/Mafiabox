import * as _ from 'lodash'
import roles from './roles';
import * as helpers from '../common/helpers'

function setGameState(counter) {
    return {
        counter,
        phase: counter % 3,
        dayNum: Math.floor(counter/3) + 1,
    }
}

function onVote(choices, rss) {
    let ballots = {}
    let ballotCount = 0
    
    let playerNum = helpers.getPlayerCount(rss.lobby)
    let triggerNum = helpers.getTriggerNum(playerNum)

    for (var uid in choices){
        if (choices[uid] !== null){
            ballots[choices[uid]] ? ballots[choices[uid]]++ : ballots[choices[uid]] = 1
            ballotCount++
        }
    }

    let nominate = null
    for (var uid in ballots){
        if (ballots[uid] >= triggerNum) {
            nominate = uid
            break
        }
    }

    if (nominate) {
        let ts = Date.now()
        return {
            [`news/${ts}`]: {
                message: `${rss.lobby[nominate].name} has been put on trial.`,
                timestamp: ts,
                counter: rss.gameState.counter,
            },
            gameState: {
                ...setGameState(rss.gameState.counter + 1),
                nominate,
                veto: rss.gameState.veto + 1,
            },
            choice: null,
            ready: null
        }
    } else if (ballotCount >= playerNum) {
        return {
            gameState: {
                ...setGameState(rss.gameState.counter + 2),
                nominate: null,
                veto: rss.gameState.veto,
            },
            choice: null,
            ready: null
        }
    }
    return {}
}

function onTrial(votes, rss) {
    let iVotes = []
    let gVotes = []
    let news = {}
    let timestamp = Date.now()

    for (var uid in votes) {
        if (votes[uid] === 1) {
            iVotes.push(rss.lobby[uid].name)
        } else if (votes[uid] === -1) {
            gVotes.push(rss.lobby[uid].name)
        }
    }

    let nameString = ''
    if (gVotes.length === 0) {
        nameString = 'Nobody '
    } else if (gVotes.length === 1) {
        nameString = gVotes[0]
    } else {
        nameString = gVotes.join(', ')
    }
    news[timestamp] = {
        message: nameString + ' voted against' + rss.lobby[rss.nominate].name + '.',
        timestamp,
        counter: rss.gameState.counter,
    }

    let nextCounter
    let nextVeto
    if (gVotes.length > iVotes.length) {
        rss.lobby[rss.nominate].dead = true
        news[timestamp + 1] = {
            message: rss.lobby[rss.nominate].name + ' has been hung!',
            timestamp,
            counter: rss.gameState.counter,
        }
        nextCounter = rss.gameState.counter + 1
        nextVeto = 0
    } else {
        news[timestamp + 1] = {
            message: rss.lobby[rss.nominate].name + ' was not hung.',
            timestamp,
            counter: rss.gameState.counter
        }
        if (rss.gameState.veto === 3) {
            nextCounter = rss.gameState.counter + 1
            nextVeto = 0
        } else {
            nextCounter = rss.gameState.counter - 1
            nextVeto = rss.gameState.veto + 1
        }
    }

    return {
        news,
        lobby: rss.lobby,
        gameState: {
            ...setGameState(nextCounter),
            nominate: null,
            veto: nextVeto,
        },
        ready: null,
        choice: null,
    }
}

function onNight(choices, rss) {
    let lobby = rss.lobby
    let events = {}
    let actions = []

    //push all actions into an array with their prio
    for (var uid in lobby) {
        actions.push({
            uid,
            priority: roles[lobby[uid].roleId].priority,
        })
        events[uid] = {}
    }

    //shuffle order & stable sort by prio
    actions = _.shuffle(actions)
    actions.sort((a, b) => a.priority - b.priority)

    //do all actions
    for (var i=0; i<actions.length; i++) {
        _action(
            actions[i].uid,
            rss.lobby,
            rss.gameState.counter,
            choices,
            events,
        )
    }

    //clean up lobby before writing it
    for(var uid in lobby){
        lobby[uid].flag = undefined;
        lobby[uid].health = undefined;
    }

    return {
        events,
        lobby,
        gameState: {
            ...setGameState(rss.gameState.counter + 1),
            nominate: null,
            veto: 0,
        },
        choice: null,
        ready: null,
    }
}

//[a]ctor
//check for flags, give event text, do role
function _action(a, lobby, ctr, choices, events) {
    var flags = lobby[choices[a]].flag
    var ts = Date.now()
    var defaultInfo = {
        timestamp: ts,
        counter: ctr,
    }
    if (flags) {
        for (var uid in flags) {
            flags[uid](a, lobby)
        }
    }

    if (roles[lobby[a].roleid].text) {
        events[choices[a]][ts] = { message: roles[lobby[a].roleid].text, ...defaultInfo }
    }

    switch(lobby[a].roleId) {
        case 'a':
            events[a][ts] = { message: `Your target is a ${roles[lobby[choices[a]].roleId].name}.`, ...defaultInfo }
            break
        case 'c':
        case 'd':
        case 'e':
            lobby[choices[a]].health[a] = -1
            break
        case 'k':
            lobby[choices[a]].sus = true
            break
        case 'A':
            if (roles[lobby[choices[a]].roleId].sus || lobby[choices[a]].sus) {
                events[a][ts] = { message: 'Your target is suspicious. They are a member of the mafia!', ...defaultInfo }
            } else {
                events[a][ts] = { message: 'Your target is not suspicious.', ...defaultInfo }
            }
            break
        case 'B':
            lobby[choices[a]].flag[a] = (v, lobby) => {
                if (!roles[lobby[v].roleId].sneak){
                    events[a][ts] = { message: `${lobby[v].name} visited your target last night!`, ...defaultInfo }
                }
            }
            break
        case 'E':
            lobby[a].roleId = lobby[choices[a]].roleId
            break
        case 'H':
            lobby[choices[a]].health[a] = -1
            break
        case 'K':
            lobby[choices[a]].health[a] = 1
            break
        case 'g':
        case 'Q':
            if (!roles[lobby[choices[a]].roleId].rbi) {
                choices[choices[a]] = -1
                events[choices[a]][ts] = { message: 'You were distracted last night.', ...defaultInfo }
            } else {
                events[choices[a]][ts] = { message: 'Someone tried to distract you, but you were not affected.', ...defaultInfo }
            }
            break
        case 'I':
            if (a === choices[a]) {
                lobby[a].health[a] = 100
                lobby[a].flag[a] = (v, lobby) => {
                    lobby[v].health[a] = -1
                    events[a][ts] = { message: 'You shot someone who visited you!', ...defaultInfo }
                }
            }
            break
        default:
    }
}

export {
    onVote,
    onTrial,
    onNight,
}