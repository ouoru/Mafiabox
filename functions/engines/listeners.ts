import * as db from '../common/db'
import * as _ from 'lodash'
import * as helpers from '../common/helpers'
import * as logic from './logic'

async function onPlayerJoinedRoom(roomId, uid) {
    //await player info like name, etc
    return db.update(
        `rooms/${roomId}/lobby/${uid}`,
        {
            joinedAt: Date.now(),
        }
    )
}

async function onGameStatusUpdate(change, roomId) {
    if (change.before.val() !== 'statusType/lobby' || change.after.val() !== 'statusType/pregame') return
    
    let rss = await db.get(`rooms/${roomId}`)
    
    //prepare role list
    let rolesArr = [];
    for(var id in rss.config.roles){
        for(var j=0; j<rss.config.roles[id]; j++){
            rolesArr.push(id)
        }
    }
    rolesArr = _.shuffle(rolesArr)

    //Finishing player details
    let lobby = rss.lobby
    let ready = {}
    let counter = 0
    
    for (var uid in rss.lobby) {
        lobby[uid].roleId = rolesArr[counter]
        
        ready[uid] = false
        counter++
    }

    return db.update(
        `rooms/${roomId}`,
        {
            lobby,
            ready,
            gameState: {
                counter: 0,
                phase: 0,
                dayNum: 1,
                nominate: null,
                veto: 0,
            },
            config: {
                status: 'statusType/game'
            }
        }
    )
}

async function onPlayerChoiceHandler(roomId:number) {
    let rss = await db.get(`rooms/${roomId}`)
    let write = {
        updates: {},
        ts: Date.now(),
    }

    const phase = rss.gameState.phase
    const phaseListener = rss.library[phase] && rss.library[phase].phaseListener

    Function(`return ${phaseListener}`)()(rss, write)

    return db.update(`rooms/${roomId}`, write.updates)
}

async function onPlayerLoadHandler(loaded, roomId) {
    let roomSnapshot = await db.get(`rooms/${roomId}`)
    let playerNum = helpers.getPlayerCount(roomSnapshot.lobby)

    if (Object.keys(loaded).length < playerNum) return

    let ready = {};
    for (var uid in roomSnapshot.ready) {
        ready[uid] = false
    }

    return db.update(
        `rooms/${roomId}`,
        {
            ready,
            loaded: null,
            choice: null,
        }
    )
}

export {
    onPlayerJoinedRoom,
    onGameStatusUpdate,
    onPlayerChoiceHandler,
    onPlayerLoadHandler,
}