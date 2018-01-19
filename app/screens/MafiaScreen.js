
import React from 'react';
import {
    View,
    Image,
    AsyncStorage,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Animated,
    Dimensions
}   from 'react-native';

import { StackNavigator } from 'react-navigation';
import { NavigationActions } from 'react-navigation';

import colors from '../misc/colors.js';
import styles from '../misc/styles.js';
import Rolesheet from '../misc/roles.json';
import Screens from '../misc/screens.json';
import Images from '../../assets/images/index.js';
import Phases from '../misc/phases.json';

import { CustomButton } from '../components/CustomButton.js';
import { HelperButton } from '../components/HelperButton.js';

import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

import randomize from 'randomatic';
import * as Animatable from 'react-native-animatable';
const AnimatableIcon = Animatable.createAnimatableComponent(FontAwesome)

//Firebase
import firebase from '../firebase/FirebaseController.js';

const FADEOUT_ANIM = 300;
const SIZE_ANIM = 500;
const FADEIN_ANIM = 300;

export default class Mafia_Screen extends React.Component {

constructor(props) {
    super(props);

    const { params } = this.props.navigation.state;
    const roomname = params.roomname;

    this.state = {
        roomname:           params.roomname,
        phase:              '',
        daycounter:         '',
        phasename:          '',
        topmessage:         '',
        phasebackground:    'night',
        nextphase:          null,

        myname:             '',
        myrole:             '',
        myroleid:           '',
        targetdead:         '',
        targettown:         '',

        namelist:           [],

        triggernum:         1000,
        playernum:          1000,

        ready:              false,
        presseduid:         '',
        disabled:           false,

        amidead:            true,
        amimafia:           false,
        amipicking:         false,
        amiowner:           false,

        nominate:           '',
        nominee:            '',

        gameover:           false,
        showOptions:        true,

        backSize:           new Animated.Value(0.01),
        voteSize:           new Animated.Value(0.12),
        abstainSize:        new Animated.Value(0.12),
        listSize:           new Animated.Value(0.01),
        waitingSize:        new Animated.Value(0.01),
        
        titleOpacity:       new Animated.Value(0),
        backOpacity:        new Animated.Value(0),
        voteOpacity:        new Animated.Value(0),
        abstainOpacity:     new Animated.Value(0),
        listOpacity:        new Animated.Value(0),
        waitingOpacity:     new Animated.Value(0),
    };

    this.height             = Dimensions.get('window').height;
    this.width              = Dimensions.get('window').width;
    this.user               = firebase.auth().currentUser.uid;

    this.roomRef            = firebase.database().ref('rooms/' + roomname);
    this.myInfoRef          = this.roomRef.child('listofplayers').child(this.user);
    this.readyValueRef      = this.roomRef.child('ready').child(this.user);
    this.mafiaRef           = this.roomRef.child('mafia');
    
    this.listRef            = this.roomRef.child('listofplayers');
    this.playernumRef       = this.roomRef.child('playernum');
    this.nominationRef      = this.roomRef.child('nominate');
    this.ownerRef           = this.roomRef.child('owner');
    this.phaseRef           = this.roomRef.child('phase');
    this.actionRef          = this.roomRef.child('actions');

    //Owner Listening
    this.guiltyVotesRef     = this.roomRef.child('guiltyvotes');
    this.voteRef            = this.roomRef.child('votes');
    this.readyRef           = this.roomRef.child('ready').orderByValue().equalTo(true);
    this.loadedRef          = this.roomRef.child('loaded');

    //Transition Screen
    this.dayCounterRef      = this.roomRef.child('daycounter');

    this.msgRef             = firebase.database().ref('messages').child(this.user);
    this.globalMsgRef       = firebase.database().ref('globalmsgs').child(roomname);
}

componentWillMount() {

    this.myInfoRef.on('value',snap=>{
        if(snap.exists()){
            
            if(snap.val().roleid){
                //Role information
                this.setState({
                    myroleid:       snap.val().roleid,
                    myrole:         Rolesheet[snap.val().roleid].name,
                    rolerules:      Rolesheet[snap.val().roleid].rules,
                    amimafia:       Rolesheet[snap.val().roleid].type == 1,
                    targetdead:     Rolesheet[snap.val().roleid].targetdead?true:false,
                    targettown:     Rolesheet[snap.val().roleid].targettown?true:false,
                })
            }

            //Button press states and Living state
            this.setState({
                presseduid:         snap.val().presseduid,
                amidead:            snap.val().dead,
                myname:             snap.val().name,
            })
        }
    })

    this.readyValueRef.on('value',snap=>{
        if(snap.exists()){
            if(this.state.amidead){
                this._viewChange(false,false,false,false,true,false)
            } else if(snap.val() == true){
                this.setState({ready:true})
                this._viewChange(false,false,false,false,false,true)
            } else {
                this.phaseRef.once('value',phase=>{
                    if(phase.val() == 4){
                        if(this.state.amipicking){
                            this._viewChange(true,false,false,false,true,false)
                        } else {
                            this._viewChange(true,false,false,false,false,true)
                        }
                    } else {
                        this._viewChange(true,false,true,true,false,false)
                    }
                })
            }
        } else {
            if(this.state.amidead){
                this.setState({ready:false})
                this._viewChange(true,false,false,false,false,false)
            } else {
                this.setState({ready:false})
                this._viewChange(true,false,false,false,false,false)
                setTimeout(()=>{
                    this.readyValueRef.once('value',snap=>{
                        if(snap.exists()){
                            this.readyValueRef.remove();
                        } else {
                            this.loadedRef.child(this.user).set(true)
                        }
                    })
                },1500)
            }
        }
    })

    this.ownerRef.on('value',snap=>{
        this.setState({amiowner:snap.val() == this.user})
    })

    this.listRef.on('value',snap=>{
        if(snap.exists()){
            //Update colors + options for Player Name Buttons
            var list = [];
            snap.forEach((child)=> {
                list.push({
                    name:           child.val().name,
                    dead:           child.val().dead?true:false,
                    immune:         child.val().immune?true:false,
                    status:         child.val().status?true:false,
                    statusname:     child.val().status,
                    type:           child.val().type,
                    roleid:         child.val().roleid,
    
                    key:            child.key,
                })
            })
    
            this.setState({namelist:list})
        }
    })

    this.playernumRef.on('value',snap=>{
        if(snap.exists()){
            const minusone = snap.val() - 1;
            const mod = minusone%2;
            this.setState({ 
                triggernum:     (((minusone - mod)/2)+1),
                playernum:      snap.val(),
            })

            this.mafiaRef.orderByChild('alive').equalTo(true).once('value',mafia=>{
                if(mafia.numChildren() == 0){
                    this.phaseRef.set(6)
                }
                else if(mafia.numChildren()*2+1 > snap.val()){
                    this.phaseRef.set(7)
                }
            })
        }
    })

    this.nominationRef.on('value',snap=>{
        if(snap.exists()){
            this.listRef.child(snap.val()).once('value',sp=>{
                this.setState({nominate: snap.val(), nominee: sp.val().name})
            })
            
            this.setState({amipicking:snap.val() == this.user})
        }
    })

    this.phaseRef.on('value',snap=>{
        if(snap.exists()){
            Animated.timing(
                this.state.titleOpacity,{
                    toValue:0,
                    duration:1000
                }
            ).start()

            setTimeout(()=>{
                this.setState({
                    phase:snap.val(),
                    phasename: (Phases[snap.val()]).name,
                    topmessage: (Phases[snap.val()]).topmessage,
                    btn1: (Phases[snap.val()]).btn1,
                    btn2: (Phases[snap.val()]).btn2,
                    phasecolor: (Phases[snap.val()]).phasecolor,
                })
                Animated.timing(
                    this.state.titleOpacity,{
                        toValue:1,
                        duration:1000
                    }
                ).start()
            },1000)
        }
    })

    this.dayCounterRef.on('value',snap=>{
        if(snap.exists()){
            this.setState({
                daycounter: snap.val(),
            })
        }
    })
    
    //Count listeners for the room owner
    this.readyRef.on('value',snap=>{
        if(snap.exists() && this.state.amiowner && ((snap.numChildren()+1)>this.state.playernum)
            && this.state.playernum>0){
                //Phase 2 CONTINUE
                if(this.state.phase == 2){
                    
                    this.voteRef.once('value').then((votes)=>{
                        if(votes.exists()){
                            var counter = 0;
                            votes.forEach((child)=>{
                                counter ++;
                                if(child.numChildren() + 1 > this.state.triggernum){
                                    //Do nothing
                                } else if (counter+1 > votes.numChildren()){
                                    this.actionRef.remove();
                                    this._resetDayStatuses();
                                    this._changePhase(Phases[this.state.phase].continue);
                                }
                            });
                        } else {
                            this.actionRef.remove();
                            this._resetDayStatuses();
                            this._changePhase(Phases[this.state.phase].continue);
                        }
                    })
                }
                //Phase 3 Handling both CONTINUE and TRIGGER
                else if(this.state.phase == 3){
                    
                    this.guiltyVotesRef.once('value',guiltyvotes=>{

                        var counter = 0;
                        var names = 'Nobody';

                        guiltyvotes.forEach((votechild)=>{ 
                            counter++;
                            if(counter==1){names=votechild.val()}
                            else if(counter>1){names=names+', '+votechild.val()}
                        })
                        
                        this._noticeMsgGlobal(this.state.roomname,'#d31d1d', names + ' voted against ' 
                            + this.state.nominee + '.') 

                        if((guiltyvotes.numChildren()+1)>this.state.triggernum){

                            firebase.database().ref('rooms/' + this.state.roomname + '/listofplayers/' 
                                + this.state.nominate).update({dead:true}).then(()=>{
                                    this._changePlayerCount(false);
                                })

                            firebase.database().ref('rooms/'+ this.state.roomname +'/listofplayers/'
                            +this.state.nominate).once('value',dead=>{

                                this._noticeMsgGlobal(this.state.roomname,'#d31d1d', dead.val().name + ' was hung.')
                                
                                if(dead.val().type == 1){
                                    this.roomRef.child('mafia').child(this.state.nominate).update({alive:false});

                                    if(dead.val().roleid == 'a' || dead.val().roleid == 'b'){
                                        this._changePhase(4);
                                    } else {
                                        this._changePhase(Phases[this.state.phase].trigger)
                                    }
                                } else if (dead.val().roleid == 'W'){
                                    guiltyvotes.forEach((jester)=>{ 
                                        firebase.database().ref('rooms/' + this.state.roomname + '/listofplayers/' 
                                        + jester.key).update({bloody:true,suspicious:true})
                                    })

                                    this._noticeMsgGlobal(this.state.roomname,'#d31d1d',
                                        names + ' have blood on their hands and look suspicious.')
                                    this._changePhase(Phases[this.state.phase].trigger)

                                } else {
                                    this._changePhase(Phases[this.state.phase].trigger)
                                }
                            })
                                
                            
                        } else {
                            this._noticeMsgGlobal(this.state.roomname,'#34cd0e',this.state.nominee 
                                + ' was not hung.',1)

                            this.listRef.child(this.state.nominate).update({immune:true})

                            this._changePhase(Phases[this.state.phase].continue)
                        }

                    })
                }
                //Phase 5 Handling CONTINUE
                else if(this.state.phase == 5){
                    
                    new Promise((resolve) => resolve(this._adjustmentPhase())).then(()=>{
                        new Promise((resolve) => resolve(this._actionPhase())).then(()=>{
                            
                            this.guiltyVotesRef.remove();
                            this._resetDayStatuses();
                            
                            this._changePhase(Phases[this.state.phase].continue);

                            //After Night, the day count increases
                            this.dayCounterRef.once('value',daycount=>{
                                this.dayCounterRef.set(daycount.val()+1);
                            })
                        });
                    });
                };
        }
    })

    this.voteRef.on('value', snap=>{
        //Votes should only exist in Phase 2
        if(snap.exists() && this.state.amiowner){
            snap.forEach((child)=>{
                if(child.numChildren() + 1 > this.state.triggernum){
                    if(Phases[this.state.phase].trigger){
                        this.actionRef.remove();

                        this.roomRef.update({nominate:child.key});
                        this.listRef.child(child.key).child('name').once('value',getname=>{
                            this._noticeMsgGlobal(this.state.roomname,'#d31d1d',
                            getname.val() + ' has been nominated.')
                        })

                        this._changePhase(Phases[this.state.phase].trigger);
                    }
                }
            })
        }
    })

    this.loadedRef.on('value',snap=>{
        if(snap.exists() && this.state.amiowner){
            if(snap.numChildren() == this.state.playernum){
                this.roomRef.child('nextphase').once('value',nextphase=>{
                    this.roomRef.update({ phase:nextphase.val() })
                    .then(()=>{
                        this.listRef.once('value',snap=>{
                            snap.forEach((child)=>{
                                //Set all votes to 0 and RESET Buttons
                                this.listRef.child(child.key).update({presseduid:'foo'})
                                this.roomRef.child('ready').child(child.key).set(false).then(()=>{
                                    this.loadedRef.remove();
                                    this.roomRef.child('nextphase').remove();
                                })
                            })
                        })
                    })
                })
            }
        }
    })
}

componentWillUnmount() {

    if(this.myInfoRef){
        this.myInfoRef.off();
    }
    if(this.readyValueRef){
        this.readyValueRef.off();
    }
    if(this.ownerRef){
        this.ownerRef.off();
    }
    if(this.listRef){
        this.listRef.off();
    }
    if(this.playernumRef){
        this.playernumRef.off();
    }
    if(this.nominationRef){
        this.nominationRef.off();
    }
    if(this.phaseRef){
        this.phaseRef.off();
    }
    if(this.nominationRef){
        this.nominationRef.off();
    }

    //Owner Listeners
    if(this.readyRef){
        this.readyRef.off();
    }
    if(this.voteRef){
        this.voteRef.off();
    }
    if(this.loadedRef){
        this.loadedRef.off();
    }

    //Transition Screen
    if(this.dayCounterRef){
        this.dayCounterRef.off();
    }
}

_buttonPress() {
    this.setState({disabled:true});
    setTimeout(() => {this.setState({disabled: false})}, 1100);
}

_changePhase(newphase){
    this.setState({nextphase:newphase})
    this.roomRef.child('nextphase').set(newphase).then(()=>{
        this.roomRef.child('ready').remove().then(()=>{
            this.voteRef.remove()
        })
    })
}

_resetDayStatuses() {
    this.listRef.once('value',snap=>{
        snap.forEach((child)=>{
            this.listRef.child(child.key).update({
                immune:null,
                status:null
            })
        })
    })
}

_readyValue(status){
    this.readyValueRef.set(status)
}
_pressedUid(uid){
    this.myInfoRef.update({presseduid: uid})
}

//1100 ms TOTAL
_viewChange(title,back,vote,abstain,list,waiting) {
    
    Animated.sequence([
        Animated.parallel([
            Animated.timing(
                this.state.backOpacity, {
                    duration: FADEOUT_ANIM,
                    toValue: 0
            }),
            Animated.timing(
                this.state.voteOpacity, {
                    duration: FADEOUT_ANIM,
                    toValue: 0
            }),
            Animated.timing(
                this.state.abstainOpacity, {
                    duration: FADEOUT_ANIM,
                    toValue: 0
            }),
            Animated.timing(
                this.state.listOpacity, {
                    duration: FADEOUT_ANIM,
                    toValue: 0
            }),
            Animated.timing(
                this.state.waitingOpacity, {
                    duration: FADEOUT_ANIM,
                    toValue: 0
            })
        ]),
        Animated.parallel([
            Animated.timing(
                this.state.backSize, {
                    duration: SIZE_ANIM,
                    toValue: back?0.12:0.01
            }),
            Animated.timing(
                this.state.voteSize, {
                    duration: SIZE_ANIM,
                    toValue: vote?0.12:0.01
            }),
            Animated.timing(
                this.state.abstainSize, {
                    duration: SIZE_ANIM,
                    toValue: abstain?0.12:0.01
            }),
            Animated.timing(
                this.state.listSize, {
                    duration: SIZE_ANIM,
                    toValue: list?0.75:0.01
            }),
            Animated.timing(
                this.state.waitingSize, {
                    duration: SIZE_ANIM,
                    toValue: waiting?0.15:0.01
            }),
        ]),
        Animated.parallel([
            Animated.timing(
                this.state.backOpacity, {
                    duration: FADEIN_ANIM,
                    toValue: back?1:0
            }),
            Animated.timing(
                this.state.voteOpacity, {
                    duration: FADEIN_ANIM,
                    toValue: vote?1:0
            }),
            Animated.timing(
                this.state.abstainOpacity, {
                    duration: FADEIN_ANIM,
                    toValue: abstain?1:0
            }),
            Animated.timing(
                this.state.listOpacity, {
                    duration: FADEIN_ANIM,
                    toValue: list?1:0
            }),
            Animated.timing(
                this.state.waitingOpacity, {
                    duration: FADEIN_ANIM,
                    toValue: waiting?1:0
            })
        ])
    ]).start()
}

//Pressing any name button
_nameBtnPress(item){

    if(!this.state.disabled){

        this._buttonPress();

        if(this.state.phase == 2){ 
            if(this.state.amidead){
                this.setState({topmessage:'You are Dead.'})
            } else if (item.dead){
                this.setState({topmessage:'That player is Dead.'})
            } else if (item.immune){
                this.setState({topmessage:'That player is Immune'})
            } else {
                this.setState({topmessage:'You have selected ' + item.name + '.'})
                this._pressedUid(item.key);
                this._readyValue(true);
                this.voteRef.child(item.key).child(this.user).set(this.state.myname);
            }
        }  else if(this.state.phase == 4){
            if(!this.state.amipicking){
                this.setState({topmessage:'You are not Picking.'})
            } else if (item.dead){
                this.setState({topmessage:'That player is Dead.'})
            } else {
                this.mafiaRef.child(item.key).once('value',mafiacheck=>{
                    if(mafiacheck.exists()){
                        this.mafiaRef.child(item.key).update({roleid:this.state.myroleid})
                        .then(()=>{
                            this.listRef.child(item.key).update({roleid:this.state.myroleid})
                            .then(()=>{
                                this.actionRef.remove();
                                this._resetDayStatuses();
                                this._changePhase(5);
                            })
                        })
                    } else {
                        this.setState({topmessage: item.name + ' is not a member of the Mafia.'})
                    }
                })
            }
        } else if (this.state.phase==5) {

            if(this.state.amidead){
                this.setState({topmessage:'You are Dead.'})
            } else if (this.state.targettown && item.type != 2){
                this.setState({topmessage:'Select a Town Player.'})
            } else if (this.state.targetdead && !item.dead){
                this.setState({topmessage:'Select a Dead player.'})
            } else {
                this.setState({topmessage:'You have selected ' + item.name + '.'})
                
                this.actionRef.child(this.user).update({
                        target:     item.key,
                        targetname: item.name,
                        roleid:     this.state.myroleid,
                }).then(()=>{
                    this.actionRef.child(item.key).child(this.state.myroleid).child(this.user)
                        .set(this.state.myname).then(()=>{
                            this._pressedUid(item.key);
                            this._readyValue(true);
                        })
                })
            }
        }
    }
}

_nameBtnLongPress(item){
    if(this.state.phase == 5) {
        if(this.state.amimafia){
            this.mafiaRef.once('value',snap=>{
                snap.forEach((child)=>{
                    this._noticeMsg(child.key, this.state.myname + ' wants to kill ' + item.name + '.')
                })
            })
        }
    }
}

//Day Phase - VOTE
_optionOnePress() {

    this._buttonPress();
    
    if(this.state.phase == 2){
        this._viewChange(false,true,false,false,true,false)
    } else if (this.state.phase == 3){
        this.setState({topmessage:'You voted INNOCENT.'})
        this.guiltyVotesRef.child(this.user).set(null).then(()=>{
            this._readyValue(true);
        })
    } else if (this.state.phase == 5){
        this._viewChange(false,true,false,false,true,false)
    } else if (this.state.phase == 6 || this.state.phase == 7){
        alert('feature not available yet')
    }
}

//Day Phase - ABSTAIN
_optionTwoPress() {
    
    if(this.state.phase != 6 && this.state.phase != 7){
        this._buttonPress();
    }

    if(this.state.phase == 2){
        this._readyValue(true);
        this.setState({topmessage:'You abstained.'})
    } else if (this.state.phase == 3){
        this.setState({topmessage:'You voted GUILTY.'})
        this.guiltyVotesRef.child(this.user).set(this.state.myname).then(()=>{
            this._readyValue(true);
        })
    } else if (this.state.phase == 5){
        this._readyValue(true);
        this.setState({topmessage:'You stayed home.'})
    } else if (this.state.phase == 6 || this.state.phase == 7){
        this._gameOver();
    }
}

//Day Phase - WAITING PRESS
_resetOptionPress() {

    this._buttonPress();

    if(this.state.phase != 4){
        this._viewChange(true,false,true,true,false,false)
        this.setState({topmessage:null})
    }

    if(this.state.phase == 2){

        this._readyValue(false);

        if(this.state.presseduid != 'foo'){
            this._pressedUid('foo');
            this.voteRef.child(this.state.presseduid).child(this.user).remove()
        }

    } else if (this.state.phase == 3){

        this.guiltyVotesRef.child(this.user).set(null).then(()=>{
            this._readyValue(false);
        })

    } else if (this.state.phase == 5){

        this.actionRef.child(this.user).update({
                roleid:     null,
                target:     null,
                targetname: null,
            });

        this.actionRef.child(this.state.presseduid).child(this.state.myroleid)
        .child(this.user).set(null)
            .then(()=>{
                this._readyValue(false);
                this._pressedUid('foo');
            })
    }
}

_renderPhaseName() {
    if(this.state.phase == 2 || this.state.phase == 5){
        return <Text style = {{color:colors.titlefont, alignSelf:'center', 
        fontFamily: 'LuckiestGuy-Regular', fontSize:35}}>
        {this.state.phasename + ' ' + this.state.daycounter}
    </Text>
    } else {
        return <Text style = {{color:colors.titlefont, alignSelf:'center', 
        fontFamily: 'LuckiestGuy-Regular', fontSize:35}}>
        {this.state.phasename}
    </Text>
    }
}

_renderTopMessage(){
    
    if(this.state.phase == 3 || (this.state.phase == 4 && this.state.nominate != this.user)){
        return <Text style = {{color:colors.titlefont, alignSelf:'center', 
            fontFamily: 'ConcertOne-Regular', fontSize:14}}>
            {this.state.nominee + ' ' + this.state.topmessage}
        </Text>
    } else {
        return <Text style = {{color:colors.titlefont, alignSelf:'center',
            fontFamily: 'ConcertOne-Regular', fontSize:14}}>
            {this.state.topmessage}
        </Text>
    }
}

//Rendering Main Visuals of Game Board
_renderListComponent(){

    return <FlatList
        data={this.state.namelist}
        renderItem={({item}) => (
            <View style = {{marginBottom:10}}><CustomButton
                flex = {0.8}    
                onPress         = {() => { this._nameBtnPress(item) }}
                onLongPress     = {() => { this._nameBtnLongPress(item) }}
                color           = {item.dead ? colors.dead : (item.immune? colors.immune : 
                                  (item.status?colors.status:colors.namebtn))}
                shadow          = {item.dead ? colors.deadshadow : (item.immune? colors.lightshadow : 
                                  (item.status?colors.statusshadow:colors.lightshadow))}
                depth           = {6}
                radius          = {40}
                component = {<View style = {{flexDirection:'row',alignItems:'center',
                    justifyContent:'center', height:40}}>
                    <View style = {{flex:0.15,justifyContent:'center',alignItems:'center'}}>
                    <MaterialCommunityIcons name={item.dead?'skull':item.readyvalue?
                        'check-circle':(item.immune?'needle':(item.status?item.statusname:null))}
                        style={{color:colors.font, fontSize:26}}/>
                    </View>
                    <View style = {{flex:0.7, justifyContent:'center'}}>
                        {item.dead?
                            <Text style = {styles.lfont}>
                                {item.name + ' (' + Rolesheet[item.roleid].name + ') '}</Text>
                            :
                            <Text style = {styles.lfont}>{item.name}</Text>
                        }
                    </View>
                    <View style = {{flex:0.15}}/>
                </View>}
            /></View>
        )}
        keyExtractor={item => item.key}
    />
    
}

_renderWaitingComponent() {
    return <FlatList
        data={this.state.namelist}
        renderItem={({item}) => (
            <Text style = {styles.concerto}>
                {item.name}
            </Text>
        )}
        keyExtractor={item => item.key}
    />
}

//true  -> increase player count by 1
//false -> decrease player count by 1
_changePlayerCount(bool){
    if(bool){
        this.playernumRef.transaction((playernum)=>{return playernum+1})
    } else {
        this.playernumRef.transaction((playernum)=>{return playernum-1})
    }
}

//Sends a private notice message
_noticeMsg(target,message){
    firebase.database().ref('messages/' + target).push({from: 'Private', message: message})
}

//Creates a public notice message
_noticeMsgGlobal(roomname,color,message){
    firebase.database().ref('globalmsgs/' + roomname)
        .push({from: 'Public', color: color, message: message})
}

//Action Roles that adjust
_adjustmentPhase() {
    this.actionRef.once('value',snap=>{
        snap.forEach((child)=>{

            if (child.val().E) {
                this.actionRef.child(child.val().target).child(child.val().roleid)
                    .child(child.key).remove()
                this.actionRefchild(child.key).update({ targetname: 'Nobody' })
            }

        })
    })
}

//Action Roles
_actionPhase() {
    this.actionRef.once('value',snap=>{
        snap.forEach((child)=>{
            if(!child.val().E){
                //Assassin
                if (child.val().roleid == 'a') {
                    this.actionRef.child(child.val().target).once('value',innersnap=>{
                        if(!innersnap.val().D){
                            this.listRef.child(child.val().target).update({dead:true});
                            this.myInfoRef.update({bloody:true});
                            this._changePlayerCount(false);

                            this._noticeMsg(child.val().target,'You were stabbed.');
                            this._noticeMsgGlobal(this.state.roomname,'#d31d1d',
                                child.val().targetname + ' was killed.');
                        } 
                        this._noticeMsg(child.key,'You have stabbed ' + child.val().targetname + '.');
                    })
        
                }
                //Murderer 
                else if (child.val().roleid == 'b') {
                    this.actionRef.child(child.val().target).once('value',innersnap=>{
                        if(!innersnap.val().D){
                            this.listRef.child(child.val().target).update({dead:true});
                            this.myInfoRef.update({bloody:true});
                            this._changePlayerCount(false);

                            this._noticeMsg(child.val().target,'You were stabbed.');
                            this._noticeMsgGlobal(this.state.roomname,'#d31d1d',
                                child.val().targetname + ' was killed.');
                        }
                        this._noticeMsg(child.key,'You have stabbed ' + child.val().targetname + '.');
                    })
    
                }
                //Schemer
                else if (child.val().roleid == 'c') {
                    this._noticeMsg(child.key,'You framed ' + child.val().targetname +" last night.");
                }
                //Spy
                else if (child.val().roleid == 'd') {
                    this.listRef.child(child.val().target).once('value',innersnap=>{
                        this._noticeMsg(child.key,'You spied on ' + child.val().targetname 
                        + ". They are a " + Rolesheet[innersnap.val().roleid].name + '.');
                    })

                }
                //Silencer
                else if (child.val().roleid == 'f') {
                    this.listRef.child(child.val().target).update({ status: 'volume-mute' })
                    this._noticeMsg(child.key,'You silenced ' + child.val().targetname + '.');
                    this._noticeMsg(child.val().target,'You were silenced.');
                }
                //Detective
                else if (child.val().roleid == 'A') {
                    this.listRef.child(child.val().target).once('value',insidesnap=>{
                        this.actionRef.child(child.val().target).once('value',scheme=>{
                            if(scheme.val().c || insidesnap.val().suspicious){
                                this._noticeMsg(child.key, child.val().targetname + ' is suspicious ...');
                            } else {
                                this._noticeMsg(child.key, child.val().targetname + ' is not suspicious.');
                            }
                        })
                    })
                }
                //Investigator
                else if (child.val().roleid == 'B') {
                    this.listRef.child(child.val().target).once('value',innersnap=>{
                        if(innersnap.val().bloody){
                            this._noticeMsg(child.key, child.val().targetname + " has blood on their hands.");
                        } else {
                            this._noticeMsg(child.key, child.val().targetname 
                            + " does not have blood on their hands.");
                        }
                    })

                    
                }
                //Doctor
                else if (child.val().roleid == 'D') {
                    this.actionRef.child(child.val().target).once('value',insidesnap=>{
                        if(insidesnap.val().a || insidesnap.val().b){
                            this.listRef.child(child.key).update({bloody:true});
                            this._noticeMsg(child.val().target,'The Doctor took care of your stab wounds.');
                            this._noticeMsg(child.key,'You healed ' + child.val().targetname +"'s stab wounds.");
                        } else {
                            this._noticeMsg(child.key, 'You visited '+ child.val().targetname + '.');
                        }
                    })
                }
                //Escort
                else if (child.val().roleid == 'E') {
                    this._noticeMsg(child.val().target, 'You were distracted last night.');
                    this._noticeMsg(child.key, 'You distracted ' + child.val().targetname +" last night.");     
                }
                //Warden
                else if (child.val().roleid == 'G') {
                    this.actionRef.child(child.val().target).once('value',insnap=>{
                        var string = 'Nobody';
                        insnap.forEach((visitor)=>{
                            if(visitor.key.length == 1){
                                visitor.forEach((person)=>{
                                    if(person.key != child.key){
                                        if(string == 'Nobody'){
                                            string = person.val();
                                        } else {
                                            string = string + ', ' + person.val();
                                        }
                                    }
                                })
                            }
                        })
                        this._noticeMsg(child.key,string + ' visited ' + child.val().targetname 
                            + "'s house last night.")
                    })
                }
                //Forensic
                else if (child.val().roleid == 'H') {
                    this.listRef.child(child.val().target).once('value',innersnap=>{
                        this._noticeMsg(child.key, child.val().targetname 
                        + "'s body resembles a " + Rolesheet[innersnap.val().roleid].name + '.');
                    })
                }
                //Overseer
                else if (child.val().roleid == 'I') {
                    this.actionRef.child(child.val().target).once('value',wheredhego=>{
                        if(wheredhego.val().targetname){
                            this._noticeMsg(child.key, child.val().targetname + ' visited ' 
                            + wheredhego.val().targetname +"s house last night.");
                        } else {
                            this._noticeMsg(child.key, child.val().targetname 
                            + ' visited Nobodys house last night.');
                        }
                    })
                }
                //Hunter
                else if (child.val().roleid == 'J') {
                    this.listRef.child(child.key).child('charges').once('value',charges=>{
                        if(charges.val() > 0){
                            this.actionRef.child(child.val().target).once('value',innersnap=>{
                                if(!innersnap.val().D){
                                    this.listRef.child(child.val().target).update({dead:true});
                                    this._changePlayerCount(false);
            
                                    this._noticeMsg(child.val().target,'You were shot.');
                                    this._noticeMsgGlobal(this.state.roomname,'#d31d1d',
                                        child.val().targetname + ' was killed.');
                                } 
                                this._noticeMsg(child.key, 'You shot ' + child.val().targetname + '.');
                            })
                            this.listRef.child(child.key).update({charges: (charges.val()-1)})
                            
                        } else {
                            this._noticeMsg(child.key, 'You are out of bullets.')
                        }
                    })
                }
                //Disguiser
                else if (child.val().roleid == 'K') {
                    this.listRef.child(child.val().target).once('value',role=>{
                        this.myInfoRef.update({roleid:role.val().roleid})
                        this._noticeMsg(child.key,'You took ' + child.val().targetname + "'s role.")
                    })
                }
            }
        })
    })

}

_gameOver() {
    AsyncStorage.removeItem('ROOM-KEY');
    AsyncStorage.removeItem('GAME-KEY');

    this.msgRef.remove();
    if(this.state.amiowner){
        this.globalMsgRef.remove();
    }
    firebase.database().ref('rooms/' + this.state.roomname + '/listofplayers').once('value',snap=>{
        if(snap.numChildren() < 2){
            firebase.database().ref('rooms/' + this.state.roomname).remove();
        } else {
            firebase.database().ref('rooms/' + this.state.roomname + '/listofplayers/' 
                + this.user).remove();
        }
    })
    
    this.props.screenProps.navigate('Home')
}
/*<Image source = {require('../../assets/images/night.png')} 
style = {{flex:1, alignSelf:'stretch', width:null}}>*/
render() {

return <View style = {{flex:1,backgroundColor:colors.background, 
     alignItems:'center'}}>

    <Animated.View style = {{position:'absolute',top:this.height*0.1, opacity:this.state.titleOpacity,
        justifyContent:'center', borderRadius:2, marginBottom:10}}>
            {this._renderPhaseName()}
            {this._renderTopMessage()}
    </Animated.View>

    <CustomButton
        size = {this.state.backSize}
        flex = {0.85}
        opacity = {this.state.backOpacity}
        depth = {8}
        color = {colors.pushbutton}
        radius = {30}
        fontSize = {25}
        disabled = {this.state.disabled}
        onPress = {()=>{ 
            this._viewChange(true,false,true,true,false,false) 
        }}
        title = 'RETURN'
    />

    <HelperButton
        title = {this.state.btn1}
        icon = 'crown'
        color = {colors.pushbutton}
        order = {1}
        onPress = {()=>{ 
            this._optionOnePress()
        }}
        showOptions = {this.state.showOptions}
        disabled = {this.state.disabled}
        degrees = {190}
    />

    <CustomButton
        size = {this.state.waitingSize}
        flex = {0.85}
        opacity = {this.state.waitingOpacity}
        depth = {10}
        color = {colors.pushbutton}
        radius = {50}
        fontSize = {25}
        disabled = {this.state.disabled}
        onPress = {()=>{ 
            this._resetOptionPress()
        }}
        title = 'WAITING'
    />

    <HelperButton
        title = {this.state.btn2}
        icon = 'crown'
        color = {colors.pushbutton}
        order = {1}
        onPress = {()=>{ 
            this._optionTwoPress()
        }}
        showOptions = {this.state.showOptions}
        disabled = {this.state.disabled}
        degrees = {350}
    />

    <Animated.View style = {{ flex:this.state.listSize,  opacity:1,
        justifyContent:'center'}}>
        {this._renderListComponent()}
    </Animated.View>

</View>
}
//</Image>
}
