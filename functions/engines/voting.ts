import roles from './roles/roles' 

//arg1: votes {}
//arg2: roomSnapshot {}
export default function processVotes(votes, rss) {
    let innocentVotes = []
    let guiltyVotes = []
    let news = []
    let lobby = rss.lobby

    //tallyVotes
    for (var uid in votes) {
        if (votes[uid] === 1) {
            innocentVotes.push(rss.lobby[uid].name)
        } else if (votes[uid] === -1) {
            guiltyVotes.push(rss.lobby[uid].name)
        }
    }

    //reportGuiltyVotes
    let nameString = ''
    if (guiltyVotes.length === 0) {
        nameString = 'Nobody '
    } else if (guiltyVotes.length === 1) {
        nameString = (guiltyVotes[0] + ' ')
    } else {
        for(var i=0; i<guiltyVotes.length; i++){
            nameString += (guiltyVotes[i] + ', ')
        }
    }
    
    news.push(nameString + 'voted against' + rss.lobby[rss.nominate].name + '.')

    //findResults
    let nextCounter
    if (guiltyVotes.length > innocentVotes.length) {
        news.push(rss.lobby[rss.nominate].name + ' has been hung!')
        
        lobby[rss.nominate].dead = true
        if (roles[lobby[rss.nominate].roleid].killer) {
            let mafiaArr = []
            for (var uid in lobby) {
                if (!lobby[uid].dead && roles[lobby[uid].roleid].type === 1) {
                    mafiaArr.push(uid)
                }
            }

            let promoted = null
            if (mafiaArr.length > 0) {
                promoted = mafiaArr[Math.floor(Math.random()*mafiaArr.length)]
            }
            if (promoted !== null) {
                lobby[promoted].roleid = roles[lobby[rss.nominate].roleid].killer
            }
        }

        nextCounter = rss.counter + 1
    } else {
        news.push(rss.lobby[rss.nominate].name + ' was not hung.')
        nextCounter = rss.counter - 1
    }

    return {
        news: {
            [rss.counter]: news
        },
        lobby,
        counter: nextCounter,
        nominate: null,
        choice: null,
        votes: null,
        ready: null
    }
}