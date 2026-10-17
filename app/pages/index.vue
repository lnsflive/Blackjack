<template>
<v-container fluid class="ma-0 pa-0 overflow-hidden">
  <v-alert v-if="authError" type="error" role="alert">{{authError}}</v-alert>
  <v-card v-if="!user || loading" class="pa-6">
    <v-card-title>Blackjack</v-card-title>
    <p>{{ loading ? 'Checking your account…' : 'Sign in with Google to recover your player on any device.' }}</p>
    <AccountForm v-if="!loading" @signed-in="loadAccount" />
    <v-btn v-if="!loading" @click="loadAccount">Retry</v-btn>
  </v-card>
  <template v-if="user && !loading">
  <v-btn @click="logout" :disabled="busy">Sign out of shared account</v-btn>
  <AppBar
    :bank="bankAmount"
    :playerName="playerName"
    :bet="betGame1"
    :hasBet2="splitShow"
    :bet2="betGame2"
    />
  <v-container fluid>
    <v-dialog
      v-model="showLeaderboards"
      top
      dark
      width="300px"
    >
      <v-data-table 
        :headers="headers"
        :items="players"
        :items-per-page="10"
        item-class="secondary"
        sort-by="bank"
        :sort-desc="true"
        dense
        key="name"
        mobile-breakpoint="200px"
        class="elevation-1"
      />
    </v-dialog>
  <v-dialog
  persistent
  v-model="createPlayer"
  overlay-opacity="0.9"
  transition="dialog-top-transition"
  >
   <v-form class="pa-6 black" @submit.prevent="submitPlayer()">
     <v-card-title>Create New Player</v-card-title>
     <p>Your player will be linked to your account. Existing names require an administrator to migrate them.</p>
     <p v-if="authError" role="alert">{{authError}}</p>
     <v-btn @click="logout" :disabled="busy">Sign out</v-btn>
      <v-text-field class="mb-6" :counter="10" v-model="tempPlayer" label="Enter Name:" />
      <v-btn @click="clear" class="secondary">Clear</v-btn>
      <v-btn @click="submitPlayer" :disabled="invalid || busy" class="success">Submit</v-btn>
   </v-form>
  </v-dialog>
  <v-dialog
  bottom
  dark
  persistent
  v-model="endGame"
  transition="dialog-bottom-transition"
  >
  <v-card>
    <div class="blue">
      <v-card-title class="justify-center">{{result}}</v-card-title>
      <v-card-subtitle class="justify-center d-flex">Place Bet</v-card-subtitle>
    </div>
    <div class="warning black--text  font-weight-bold justify-center d-flex py-3" >Bank: ${{bankAmount}}</div>
    <div class="justify-space-around d-flex flex-wrap pa-2 ">
      <div>
      <v-btn color="red" fab class="ma-2 dotted" @click="changeBet(5)">5</v-btn>
      <v-btn color="green" fab class="ma-2 dotted" @click="changeBet(25)">25</v-btn>
      <v-btn color="blue" fab class="ma-2 dotted" @click="changeBet(50)">50</v-btn>
      </div>
      <div>
      <v-btn color="black" fab class="ma-2 dotted" @click="changeBet(100)">100</v-btn>
      <v-btn color="purple" fab class="ma-2 dotted" @click="changeBet(500)">500</v-btn>
      <v-btn color="orange" fab class="ma-2 dotted" @click="changeBet(1000)">1000</v-btn>
      </div>
    </div>
    <v-col>
        <v-row><v-btn @click="logout" :disabled="busy" class="grow">Sign out of shared account</v-btn></v-row>
        <v-row><v-btn class="green pa-8 grow" @click="playAgain()">Bet:{{betGame1}}</v-btn></v-row>
        <v-row><v-btn class="error pa-8 grow" @click="clearBet2()">Clear Bet</v-btn></v-row>
        <v-row><v-btn class="secondary pa-8 grow" @click="toggleLeaderboard()"><v-icon>mdi-trophy-award</v-icon>Leaderboard<v-icon>mdi-trophy-award</v-icon></v-btn></v-row>
    </v-col>
  </v-card>
  </v-dialog>
  <v-row style="border:2px solid black;background-color:#1d4e38;" ref="deal" class="justify-center">
    <v-card 
      v-for="(carded, index) in hiddenHand"
      :key="'A' + index"
      width="80px"
      height="120px"
      light
      flat
      class="pa-1 d-flex ml-n8 dealer my-2"
      :style="{'color': carded.color}"
    >
    <v-col class="d-flex flex-column">
      <v-row class="align-center">
        {{carded.number}}
        <v-icon x-small :color="carded.color">{{ carded.icon }}</v-icon>
      </v-row>
      <v-row class="justify-center">
        <v-icon x-large :color="carded.color">{{ carded.icon }}</v-icon>
      </v-row>
      <v-row class="flex-row-reverse align-center">
        {{carded.number}}
        <v-icon x-small :color="carded.color">{{ carded.icon }}</v-icon>
      </v-row>
    </v-col>
  </v-card>
    <v-card 
      v-for="(cardes, index) in dealerHand"
      :key="index"
      width="80px"
      height="120px"
      light
      outlined
      elevation="2"
      class="pa-1 d-flex ml-n8 my-2"
      :style="{'color': cardes.color}"
    >
    <v-col class="d-flex flex-column">
      <v-row class="align-center">
        {{cardes.number}}
        <v-icon x-small :color="cardes.color">{{ cardes.icon }}</v-icon>
      </v-row>
      <v-row class="justify-center">
        <v-icon x-large :color="cardes.color">{{ cardes.icon }}</v-icon>
      </v-row>
      <v-row class="flex-row-reverse align-center">
        {{cardes.number}}
        <v-icon x-small :color="cardes.color">{{ cardes.icon }}</v-icon>
      </v-row>
    </v-col>
  </v-card>
  <v-chip v-if="!dealerHidden" class="ml-n3" :color="dealerCountColor" >{{test2}}</v-chip>
  </v-row>
<v-row v-if="splitShow" style="border:2px solid white;background-color:#1d4e38;" class="justify-center">
  <v-card 
  v-for="(cardr, index) in splitHand"
  :key="'C' + index"
  width="80px"
  height="120px"
  light
  elevation="2"
  outlined
  class="pa-1 d-flex ml-n8 my-2"
  :style="{'color': cardr.color}"
  >
    <v-col class="d-flex flex-column">
      <v-row class="align-center">
        {{cardr.number}}
        <v-icon x-small :color="cardr.color">{{ cardr.icon }}</v-icon>
      </v-row>
      <v-row class="justify-center">
        <v-icon x-large :color="cardr.color">{{ cardr.icon }}</v-icon>
      </v-row>
      <v-row class="flex-row-reverse align-center">
        {{cardr.number}}
        <v-icon x-small :color="cardr.color">{{ cardr.icon }}</v-icon>
      </v-row>
    </v-col>
  </v-card>
  <v-chip v-if="test3>0" class="ml-n3" :color="splitCountColor">{{test3}}</v-chip>
</v-row>

<v-row style="border:2px solid white;background-color:#1d4e38;" class="justify-center">
  <v-card 
  v-for="(card, index) in hand"
  :key="'B' + index"
  width="80px"
  height="120px"
  light
  elevation="2"
  outlined
  class="pa-1 d-flex ml-n8 my-2"
  :style="{'color': card.color}"
  >
    <v-col class="d-flex flex-column">
      <v-row class="align-center">
        {{card.number}}
        <v-icon x-small :color="card.color">{{ card.icon }}</v-icon>
      </v-row>
      <v-row class="justify-center">
        <v-icon x-large :color="card.color">{{ card.icon }}</v-icon>
      </v-row>
      <v-row class="flex-row-reverse align-center">
        {{card.number}}
        <v-icon x-small :color="card.color">{{ card.icon }}</v-icon>
      </v-row>
    </v-col>
  </v-card>
  <v-chip v-if="test>0" class="ml-n3" :color="handCountColor">{{test}}</v-chip>
</v-row>
      <v-row class="justify-center footer" style="border: 2px solid yellow;background-color:#1d4e38;">
        <v-col>
          <v-row v-if="gameStarted" class="justify-center ma-4">
            <v-btn v-if="hasSplit" class="ma-2 grow pa-8" @click="hitMe2()">Hit Me</v-btn>
            <v-btn v-else class="ma-2 grow pa-8" @click="hitMe()">Hit Me</v-btn>
            <v-btn class="ma-2 grow pa-8" @click="stay()">Stay</v-btn>
            <v-btn v-if="canSplit && originalBet <= bankAmount" class="ma-2 grow pa-8" @click="split()">Split</v-btn>
            <v-btn v-if="canDouble" class="ma-2 grow pa-8" @click="doubleDown()">Double Down</v-btn>
          </v-row>
        </v-col>
      </v-row>
  </v-container>
  </template>
</v-container>
</template>

<script>
import { startGoogleLogin, getAccounts } from '~/utils/google-auth'

var shuffleSound = new Audio('./sounds/shuffle.mp3')
var cardSounds = new Audio('./sounds/card.mp3')
var loseSound = new Audio('./sounds/lose.mp3')
var winSound = new Audio('./sounds/win.mp3')
var tieSound = new Audio('./sounds/tie.mp3')
var betSound = new Audio('./sounds/bet.mp3')
export default {
  data: () => ({
    cardArray : ["2","3","4","5","6","7","8","9","10","J","Q","K","A"],
    cardSuit : ["spade","diamond","heart","club"],
    cardValue : [2,3,4,5,6,7,8,9,10,10,10,10,11],
    cardIcon : ['mdi-cards-spade', 'mdi-cards-diamond', 'mdi-cards-heart', 'mdi-cards-club'],
    cardColor: ['black', 'red', 'red', 'black'],
    deck: [],
    ogDeck: [],
    cards: [],
    tmpDeck: [],
    hand: [],
    splitHand: [],
    SplitTotal: 0,
    emptyArray: [],
    leaderboard: [],
    dealerHand: [],
    hiddenHand: [],
    handTotal: 0,
    dealerCountColor: 'black',
    handCountColor: 'black',
    splitCountColor: 'black',
    dealerTotal: 0,
    dealerHidden: true,
    endGame: false,
    betAmount: 0,
    betGame1: 0,
    betGame2: 0,
    originalBet: 0,
    bankAmount: 0,
    canHit: true,
    dealerInterval: null,
    result: '',
    gameStarted: false,
    hasHit: false,
    hasHit2: false,
    canDouble: false,
    canSplit: false,
    hasSplit: false,
    splitShow: false,
    endSplit: false,
    hasDoubled: 0,
    userID: null,
    accounts: null,
    user: null,
    loading: true,
    busy: false,
    authError: '',
    profileLoaded: false,
    saveQueue: Promise.resolve(),
    createPlayer: false,
    showLeaderboards: false,
    tempPlayer: '',
    playerName: null,
    headers: [
      {
        title: 'Players',
        align: 'center',
        sortable: false,
        key: 'name',
      },
      {
        title: 'Bank',
        align: 'center',
        sortable: false,
        key: 'bank',
      }
    ],
    players: []
  }),
  methods:{
    createDeck(){
      for(let f=0; f<6;f++){
        for(let i=0; i<this.cardSuit.length;i++){
          for(let j=0; j<this.cardArray.length;j++){
            let tmpCard = {
              suit: this.cardSuit[i],
              number: this.cardArray[j],
              icon: this.cardIcon[i],
              color: this.cardColor[i],
              value: this.cardValue[j]
              }
            this.deck.push(tmpCard)
          }
        }
      }
      this.cards = this.deck.slice()
    },
    getRandomInt(min,max){
      return Math.floor(Math.random() * (max - min) + min);
    },
    shuffle(){
      this.tmpDeck = this.cards.slice()
      this.cards = []
      for(let i = 0; i < 312; i++){
        let randomInt = this.getRandomInt(0,this.tmpDeck.length)
        this.cards.push(this.tmpDeck[randomInt])
        this.tmpDeck.splice(randomInt,1)
      }
      this.tmpDeck = []
      //if(this.cards[0].number != this.cards[2].number){
      //  this.shuffle()
      //}else{
        shuffleSound.play()
        this.gameSetup()
      //}
      this.currentHand()
    },
    drawCard(myArray){
      if (!this.user || !this.profileLoaded) return
      cardSounds.play()
      const tmpCard = this.cards[0]
      myArray.push(tmpCard)
      this.cards.splice(0,1)
      this.cards.push(tmpCard)
    },
    dealerDraw(){
      if(this.test2 <=16){
        this.currentDealer()
        this.drawCard(this.dealerHand)
      }else{
         clearInterval(this.dealerInterval)
         this.checkGame()
      }
    },
    currentDealer(){
      this.dealerCountColor = 'orange'
      this.handCountColor = 'black'
      this.splitCountColor = 'black'
    },
    currentHand(){
      this.dealerCountColor = 'black'
      this.handCountColor = 'orange'
      this.splitCountColor = 'black'
    },
    currentSplit(){
      this.dealerCountColor = 'black'
      this.handCountColor = 'black'
      this.splitCountColor = 'orange'
    },
    hitMe(){
      this.currentHand()
      this.hasHit = true
      this.canDouble = false
      if(this.canHit){
          this.drawCard(this.hand)
          this.currentHand()
          if(this.test ==21){
            this.stay()
          }else{
              setTimeout(() => {this.checkGame()},500)
          }
      }
    },
    hitMe2(){
      this.currentSplit()
      this.hasHit2 = true
      this.canDouble = false
      this.drawCard(this.splitHand)
      this.currentSplit()
      if(this.test3 == 21){
        this.hasHit = false
        this.drawCard(this.hand)
        this.currentHand()
        this.canDouble = true
        this.hasSplit = false
      }else{
        setTimeout(() => {this.checkGame()},500)
      }
    },
    game1Bet(amount){
      this.betGame1 += amount
      this.bankAmount -= amount
    },
    game2Bet(amount){
      this.betGame2 += amount
      this.bankAmount -= amount
    },
    loseAmount(amount){
      this.bankAmount -= amount
    },
    winAmount(amount){
      this.bankAmount += amount
      console.log('winOGFunction: ' + amount)
    },
    doubleDown(){
      if(this.hasSplit){
        this.hasDoubled++
        this.drawCard(this.splitHand)
        this.currentSplit()
        this.hasSplit = false
        this.game2Bet(this.originalBet)
        if(this.test3>21){
          setTimeout(() => {
            this.betGame2 = 0
            loseSound.play()
            this.splitShow = false
            this.splitHand = []
            this.drawCard(this.hand)
            this.currentHand()
            if(this.test == 21){
              winSound.play()
            }
          }, 500);
        }else{
          setTimeout(() => {
            this.drawCard(this.hand)
            this.currentHand()
          }, 500);
        }
      }else{
        this.hasDoubled++
        this.gameStarted = false
        this.game1Bet(this.originalBet)
        this.drawCard(this.hand)
        this.currentHand()
        if(this.test>21){
          setTimeout(() => {this.checkGame()},500)
        }else{
          setTimeout(() => {this.stay()},500)
        }
      }
    },
    reloadPage() {
      window.location.reload();
    },
    gameSetup(){
      setTimeout(() => {this.drawCard(this.hand)},500)
      setTimeout(() => {this.drawCard(this.hiddenHand)},1000)
      setTimeout(() => {this.drawCard(this.hand)},1500)
      setTimeout(() => {this.drawCard(this.dealerHand)},2000)
      setTimeout(() => {
        if(this.hand[0].number == this.hand[1].number){
          this.canSplit = true
        }
        if(this.test == 21){
          this.betGame1 = (this.betGame1 * 3)
          this.winAmount(this.betGame1)
          console.log('win1')
          this.result = 'BlackJack + $' + this.betGame1
          this.endGame = true
          winSound.play()
          this.betGame1 = 0
        }else{
          this.gameStarted = true
        }
      },2500)
    },
    clearBet(){
      betSound.play()
      this.betGame1 = 0
      this.betgame2 = 0
    },
    clearBet2(){
      betSound.play()
      this.bankAmount += this.betGame1
      this.betGame1 = 0
      this.betgame2 = 0
    },
    totalBets(){
      const totalBet = (this.betGame1 + this.betGame2)
      return totalBet
    },
    playAgain(){
      if(this.user && this.profileLoaded && !this.busy && this.betGame1 > 0){
        betSound.play()
        this.betGame2 = 0
        this.originalBet = this.betGame1
        if((this.betGame1 * 2) <= this.bankAmount){
          this.canDouble = true
        }
        this.hasDoubled = 0
        this.gameStarted = false
        this.hasHit = false
        this.hasHit2 = false
        this.canHit = true
        this.endGame = false
        this.dealerHand = []
        this.hiddenHand = []
        this.hand = []
        this.splitHand = []
        this.splitShow = false
        this.canSplit = false
        this.hasSplit = false
        this.dealerHidden = true
        this.shuffle()
      }
    },
    checkGame(){
      if (!this.user || !this.profileLoaded) return
      if(!this.dealerHidden){
        if(this.splitShow){
          if(this.test3 < this.test2 && this.test2 <= 21){
            loseSound.play()
            this.betGame2 = 0
            this.result = 'You Lose - $' + this.betGame2
          }else if(this.test3 == this.test2){
            winSound.play()
            this.result = 'Tie = $ ' + this.betGame2
            this.winAmount(this.betGame2)
            console.log('win2')
          }else{
            winSound.play()
            this.betGame2 = (this.betGame2 * 2)
            this.winAmount(this.betGame2)
            console.log('win3')
            this.result = 'You Win + $ ' + this.betGame2
          }
        }
            if(this.test > this.test2 && this.hand.length){
            this.endGame = true
            this.betGame1 = (this.betGame1 * 2)
            this.winAmount(this.betGame1)
            console.log('win4')
            this.result = 'YOU WIN + $' + this.totalBets()
            winSound.play()
            this.clearBet()
          } else if(this.test2 > 21 && this.hand.length){
            this.betGame1 = (this.betGame1 * 2)
            this.winAmount(this.betGame1)
            console.log('win5')
            this.result = 'Dealer Bust + $' + this.totalBets()
            this.endGame = true
            winSound.play()
            this.clearBet()
          } else if(this.test == this.test2 && this.hand.length){
            this.result = 'TIE = $' + this.totalBets()
            this.winAmount(this.betGame1)
            console.log('win6')
            this.endGame = true
            tieSound.play()
            this.clearBet()
          } else{
            if(this.hand.length){
              this.betGame1 = 0
              this.result = 'Dealer Wins - $' + this.totalBets()
              this.endGame = true
              loseSound.play()
            }else{
              this.betGame2 = 0
              this.endGame = true
            }
          }
      } else{
        if(this.hasSplit){
          if(this.test3 == 21){
            winSound.play()
            setTimeout(() => {
              this.hasSplit = false
              this.drawCard(this.hand)
              this.currentHand()
              this.canDouble = true
            }, 500);
          } else if(this.test3 > 21){
            this.betGame2 = 0
            loseSound.play()
            this.hasSplit = false
            this.splitShow = false
            this.drawCard(this.hand)
            this.currentHand()
            this.canDouble = true
            if(this.test == 21){
              this.betGame1 = (this.betGame1 * 3)
              this.winAmount(this.betGame1)
              console.log('win7')
              this.result = 'BlackJack + $' + this.betGame1
              this.endGame = true
              winSound.play()
              this.betGame1 = 0
              this.hand = []
              this.stay()
            }
          }
        }else{
          if(this.splitShow){
            if(this.test > 21){
              this.betGame1 = 0
              loseSound.play()
              this.hand = []
              this.stay()
            }
          }else{
            if(this.test > 21){
              this.result = 'You Busted'
              this.endGame = true
              loseSound.play()
              this.betGame1 = 0
            }
          }
        }
      }
    },
    stay(){
      if(this.hasSplit){
       this.hasSplit = false
       this.drawCard(this.hand)
       this.currentHand()
       if(this.test == 21){
         winSound.play()
         this.stay()
       }
      }else{
        this.currentDealer()
        this.gameStarted = false
        this.canHit = false
        setTimeout(() => {
          cardSounds.play()
          this.dealerHand.splice(0,0,this.hiddenHand[0])
          this.hiddenHand = []
        },500)
        this.dealerHidden = false
        this.dealerInterval = setInterval(()=>{this.dealerDraw()}, 1000)
      }
    },
    changeBet(amount){
        if((this.betGame1 + amount) <= this.bankAmount){
          betSound.play()
          this.game1Bet(amount)
        }
    },
    authConfig(){
      const token = localStorage.getItem(this.accounts ? this.accounts.storageKey() : 'strapi_jwt')
      if (!token) throw Object.assign(new Error('Sign in required'), {response:{status:401}})
      return {headers:{Authorization:'Bearer ' + token}, withCredentials:false}
    },
    async login(){
      this.authError = ''
      try { window.location.assign(await startGoogleLogin()) }
      catch (_) { this.authError = 'Unable to start Google sign-in. Please try again.' }
    },
    async loadAccount(){
      this.loading = true
      this.authError = ''
      try {
        this.accounts = await getAccounts()
        this.user = await this.$axios.$get('/users/me', this.authConfig())
        const profiles = await this.$axios.$get('/blackjacks?portfolioUserId=' + encodeURIComponent(this.user.id), this.authConfig())
        if (profiles.length) this.applyProfile(profiles[0])
        else { this.profileLoaded = false; this.userID = null; this.createPlayer = true }
        await this.updateLeaderboard()
      } catch (error) {
        this.handleError(error)
      } finally {
        this.loading = false
      }
    },
    applyProfile(profile){
      const value = Number(profile.bank)
      if (!['number', 'string'].includes(typeof profile.bank) || String(profile.bank).trim() === '' || !Number.isFinite(value) || !Number.isSafeInteger(value) || value < 0) throw new Error('Invalid saved profile value')
      this.profileLoaded = false
      this.userID = profile.id
      this.playerName = profile.name
      this.bankAmount = value
      this.createPlayer = false
      this.endGame = true
      this.$nextTick(() => { this.profileLoaded = true })
    },
    handleError(error){
      if (error.response && error.response.status === 401) {
        this.user = null
        this.profileLoaded = false
        this.userID = null
        this.playerName = null
        this.bankAmount = 0
        this.players = []
        this.endGame = false
        this.createPlayer = false
        clearInterval(this.dealerInterval)
        this.authError = 'Please sign in with Google to continue.'
      } else {
        this.authError = 'Unable to load or save your account. Please retry before continuing.'
      }
    },
    async logout(){
      this.busy = true
      try {
        await this.saveQueue
        localStorage.removeItem(this.accounts ? this.accounts.storageKey() : 'strapi_jwt')
        try { await this.$axios.$post('/auth/logout', {}, {withCredentials:true}) } catch (_) {}
        window.location.reload()
      } catch(error) { this.handleError(error) }
      finally { this.busy = false }
    },
    async updateLeaderboard(){
      try {
        this.players = await this.$axios.$get('/blackjacks?_sort=bank:desc', this.authConfig())
      } catch(error) { this.handleError(error) }
    },
    clear(){ this.tempPlayer = '' },
    async submitPlayer(){
      if (this.invalid || this.busy) return
      this.busy = true
      this.authError = ''
      try {
        const profile = await this.$axios.$post('/blackjacks', {name: this.tempPlayer.trim()}, this.authConfig())
        this.applyProfile(profile)
      } catch(error) {
        if (error.response && error.response.status === 409) {
          if ((error.response.data.message || error.response.data.error) === 'profile_exists') await this.loadAccount()
          else this.authError = 'That name is reserved. Choose another name or contact the administrator to migrate your existing player.'
        } else this.handleError(error)
      } finally { this.busy = false }
    },
    toggleLeaderboard(){
      this.showLeaderboards = !this.showLeaderboards
    },
    split(){
        this.currentSplit()
        this.canSplit = false
        this.splitShow = true
        this.hasSplit = true
        this.game2Bet(this.originalBet)
        const tmpCard = this.hand[1]
        this.splitHand.push(tmpCard)
        this.hand.splice(1,1)
        this.drawCard(this.splitHand)
        this.currentSplit()
        if(this.test3 == 21){
          this.hasSplit = false
          winSound.play()
          this.drawCard(this.hand)
          this.currentHand()
          this.winAmount(this.originalBet * 3)
          console.log('win8')
          this.betGame1 = 0
          if(this.test == 21){
            winSound.play()
            this.stay()
          }
        }
    }
  },
  created(){
    this.createDeck()
    this.loadAccount()
  },
  beforeDestroy(){ clearInterval(this.dealerInterval) },
  watch:{
    bankAmount(bank){
      if (!this.profileLoaded || !this.user || !this.userID) return
      // Serialize writes so slower earlier responses cannot overwrite newer balances.
      this.saveQueue = this.saveQueue.then(async () => {
        if (!this.user) return
        try {
          await this.$axios.$put('/blackjacks/' + this.userID, {bank}, this.authConfig())
          await this.updateLeaderboard()
        } catch(error) { this.handleError(error) }
      })
    }
  },
  computed:{
    test() {
        while(this.hand.length){
        this.handTotal = 0
        this.hand.forEach(element => {
          if((this.handTotal + element.value) > 21 && element.number =="A"){
            this.handTotal += 1
          }else{
            this.handTotal += element.value
          }
        });
        return this.handTotal
        }
    },
        test2() {
            while(this.dealerHand.length){
            this.dealerTotal = 0
            this.dealerHand.forEach(element => {
              if((this.dealerTotal + element.value) > 21 && element.number =="A"){
                this.dealerTotal += 1
              }else{
                this.dealerTotal += element.value
              }
            });
            return this.dealerTotal
            }
    },
     test3() {
            while(this.splitHand.length){
            this.SplitTotal = 0
            this.splitHand.forEach(element => {
              if((this.SplitTotal + element.value) > 21 && element.number =="A"){
                this.SplitTotal += 1
              }else{
                this.SplitTotal += element.value
              }
            });
            return this.SplitTotal
            }
    },
    invalid(){
        if(this.tempPlayer.length > 2 && this.tempPlayer.length <= 10){
          return false
        }else{
          return true
        }
    }
  }
}
</script>
<style>
.dealer::after{
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 1;
    background-image:  linear-gradient(135deg, #444cf7 25%, transparent 25%), linear-gradient(225deg, #444cf7 25%, transparent 25%), linear-gradient(45deg, #444cf7 25%, transparent 25%), linear-gradient(315deg, #444cf7 25%, #e5e5f7 25%);
    background-position:  10px 0, 10px 0, 0 0, 0 0;
    background-size: 10px 10px;
    background-repeat: repeat;
}
.dotted::after{
  content: "";
  position: absolute;
  top:0;
  left:0;
  right:0;
  bottom: 0;
background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='100' ry='100' stroke='white' stroke-width='7' stroke-dasharray='50%25%2c 13%25' stroke-dashoffset='86' stroke-linecap='butt'/%3e%3c/svg%3e");
border-radius: 100px;
}
.topbar{
  position: absolute;
  top:0;
  left: 0;
  right: 0;
}
.dealerHand > .v-card{
  margin-left: -70px;
}
.footer{
  position:fixed;
  bottom:0;
  left: 0;
  right: 0;
}
</style>
<style lang="scss" scoped>
.v-data-table :deep(th) {
  font-size: 24px !important;
}
.v-data-table :deep(td) {
  font-size: 20px !important;
}
</style>
