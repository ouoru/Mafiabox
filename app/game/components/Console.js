import React, { Component } from 'react';
import { 
    View, 
    Text, 
    Animated, 
    Dimensions 
} from 'react-native';

import { Phases } from '../../misc/phases.js';
import { Button } from '../../components/Button';

import firebaseService from '../../firebase/firebaseService';
import playerModule from '../mods/playerModule';
import ownerModule from '../mods/ownerModule';


class Console extends Component {
        
    constructor(props) {
        super(props);

        this.state = {

            counter: null,
            phase:null,
            dayNum:null,
            buttonOne: null,
            buttonTwo: null,
            phaseName: null,

            nominee: null,

            ready: null,

        }

        this.counterRef = null
        this.nominationRef = null
        this.myReadyRef = null
    }

    componentWillMount(){

        this.counterRef = firebaseService.fetchRoomRef('counter')
        this.nominationRef = firebaseService.fetchRoomRef('nomination')
        this.myReadyRef = playerModule.fetchMyReadyRef()
        this.loadedRef = firebaseService.fetchRoomRef('loaded')

        this.counterRef.on('value',snap=>{
            if(snap.exists()){

                const phase = snap.val() % 2
                
                this.setState({
                    counter: snap.val(),
                    phase:phase,
                    dayNum: (snap.val() - snap.val() % 2)/2 + 1,
                    buttonOne: Phases[phase].buttonOne,
                    buttonTwo: Phases[phase].buttonTwo,
                    phaseName: Phases[phase].name,
                })

                ownerModule.passCounterInfo(phase, snap.val())
                    
            }
        })

        this.nominationRef.on('value',snap=>{
            if(snap.exists()){
                this.setState({nominee: snap.val()})
            }
        })

        this.myReadyRef.on('value',snap=>{
    
            if(snap.exists()){
                
                this.setState({ ready:snap.val() })
    
            } else {
    
                this.setState({ ready:null  })
    
                setTimeout(()=>{
                    this.myReadyRef.once('value',snap=>{
                        if(snap.exists()){
                            this.myReadyRef.remove();
                        } else {
                            playerModule.loaded()
                        }
                    })
                },1500)
            }
        })

    }

    componentWillUnmount(){

        if(this.counterRef) this.counterRef.off()
        if(this.nominationRef) this.nominationRef.off()
        if(this.myReadyRef) this.myReadyRef.off()

    }

    buttonOnePress() {

        this.props.viewList()

    }
    
    buttonTwoPress() {

        playerModule.selectChoice(-1)

    }

    resetOptionPress() {
        
        playerModule.selectChoice(null)

    }

    render() {

        return ( 
            <Animated.View style = {styles.console}>
                    
                <Text style = {styles.phase}>{this.state.phaseName + ' ' + this.state.dayNum}</Text>

                <Button
                    horizontal = {0.4}
                    margin = {10}
                    backgroundColor = {colors.dead}
                    onPress = {() => this.buttonOnePress()}
                ><Text style = {styles.choiceButton}>{this.state.buttonOne}</Text>
                </Button>

                <Button
                    horizontal = {0.4}
                    backgroundColor = {colors.dead}
                    onPress = {() => this.buttonTwoPress()}
                ><Text style = {styles.choiceButton}>{this.state.buttonTwo}</Text>
                </Button>

            </Animated.View>
        )
    }
}

const styles = {
    console:{
        flex:0.3,
        margin:5,
        borderRadius:5,
        backgroundColor:colors.card,
        justifyContent:'center'
    },
    phase:{
        fontSize:30,
        fontFamily:'FredokaOne-Regular',
        marginBottom:5, 
        color:colors.shadow,
        alignSelf:'center'
    },
    choiceButton: {
        fontFamily:'FredokaOne-Regular',
        fontSize: 17,
        alignSelf: 'center',
        color: colors.shadow,
        margin:4,
    },
}

export default Console
