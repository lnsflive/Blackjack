<template>
    <v-row class="pa-5 flex-nowrap accent" style="min-width:290px;">
            <v-col>
                <v-row class="justify-center"><v-btn medium class="green grow ma-1"><v-icon>mdi-cash-multiple</v-icon> {{bank}}</v-btn></v-row>
                <v-row class="justify-center"><v-btn medium class="secondary grow ma-1"><v-icon>mdi-account</v-icon> {{playerName}}</v-btn></v-row>
            </v-col>
            <v-col>
                <v-row class="justify-center"><v-btn medium class="blue grow ma-1">Bet: ${{bet}}</v-btn></v-row>
                <v-row class="justify-center"><v-btn medium class="grow ma-1" :color="splitColor" v-if="hasBet2">Bet: ${{bet2}}</v-btn></v-row>
            </v-col>
    </v-row>
</template>

<script>
export default {
    name: 'topbar',
    props: ['bank', 'bet', 'bet2', 'hasBet2', 'splitColor', 'playerName']
}
</script>
