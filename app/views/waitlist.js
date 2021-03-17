const ClubHouseApi = require('clubhouse-api');
const store = require('store');

const Waitlist = {
    beforeRouteEnter: function(to,from,next){
        const userData = store.get('userData');
        if(userData && userData.is_verified){
            next(vm => {
                vm.$router.replace('/home');
            });
        }
        next();
    },
    methods:{
        logout: function(){
            store.remove('userData');
            this.$router.replace('/');
        }
    },
    template: `
        <div class="center">
            <div class="card p-5 max-width-500 mx-auto">
                <img :src="'assets/images/handwave.png'" class="logo mx-auto mb-4" />
                <h1 class="h6 font-weight-bold d-block text-center">Clubhouse</h1>
                <small class="text-muted mb-5 d-block text-center">You're in the waiting list.</small>
                <p class="mb-0 text-center">Ask your friends to invite you to the application.</p>
                <small class="d-block text-center text-muted font-size-small">Also if they've invited you, you need to logout and login back again</small>
                <div class="d-flex align-items-center justify-content-center mt-4">
                    <button class="btn-primary" @click="logout">Logout</button>
                </div>
            </div>
        </div>
    `
}

export default Waitlist;