const ClubHouseApi = require('clubhouse-api');
const store = require('store');

const profiles = {
    ...ClubHouseApi.profiles.application.a304,
    ...ClubHouseApi.profiles.locales.English
};

const Verify = {
    beforeRouteEnter: function(to,from,next){
        const userData = store.get('userData');
        if(userData){
            if(!userData.is_verified || userData.is_onboarding || userData.is_waitlisted){
                next(vm => {
                    vm.$router.replace({name:'waitlist'});
                });
            }else{
                next(vm => {
                    vm.$router.replace({name:'home'});
                });
            }
        }else{
            next();
        }
    },
    props:['phone'],
    mounted:function(){
        if(!this.phone){
            this.$router.replace({name:'login'});
        }
    },
    data:function(){
        return {
            code: '',
            called: false,
            loading:false
        }
    },
    methods:{
        callAuth: async function(){
            const $this = this;
            if(this.phone.length <= 16 && this.phone.length >= 4){
                const result = await ClubHouseApi.api.requestCallAuth(profiles,this.phone);
                console.log(result);
                this.called = true;

                setTimeout(function(){
                    $this.called = false;
                },15000);
                
                if(result.success){
                }else{
                    console.error(result);
                    const notif = new Notification('Failed', {
                        body: result.error_message
                    });
                }
            }
        },
        verify: async function(){
            if(this.code.length === 4){
                this.loading = true;
                const result = await ClubHouseApi.api.completeMobileAuth(profiles,this.phone,this.code);
                console.log(result);
                if(result.success && result.is_verified){
                    store.set('userData',result);
                    console.log('stored user data');
                }else{
                    this.loading = false;
                    if(result.number_of_attempts_remaining){
                        const notif = new Notification('Code Not Valid',{
                            body:'Code you entered is not valid'
                        });
                        return notif;
                    }
                }
    
                if(result.is_waitlisted){
                    return this.$router.replace({name:'waitlist'});
                }
                if(!result.is_waitlisted && (!result.user_profile.username || !result.user_profile.username.length)){
                    return this.$router.replace({name:'editProfile'});
                }            
                // if(result.is_onboarding){
                //     return this.$router.replace({name:'editProfile'});
                // }
                if(result.success){
                    return this.$router.replace({name:'home'});
                }
            }
        }
    },
    template: `
        <div>
            <div class="loading mt-5" v-if="loading"><div></div><div></div><div></div><div></div></div>
            <div class="center" v-if="!loading">
                <div class="card p-5 max-width-500 mx-auto">
                    <img :src="'assets/images/handwave.png'" class="logo mx-auto mb-4" />
                    <h1 class="h6 font-weight-bold d-block text-center">Clubhouse</h1>
                    <small class="text-muted mb-5 d-block text-center">Unofficial Desktop Client</small>
                    <div class="input-group">
                        <label>Enter the code you received:</label>
                        <input type="tel" class="form-control text-center" v-model="code" placeholder="****" />
                    </div>
                    <div class="d-flex align-items-center justify-content-center mt-4">
                        <button class="btn-primary mr-4" @click="verify">Verify Code</button>
                        <button v-if="!called" class="btn-primary" @click="callAuth">Call Me</button>
                        <span v-if="called">Called!</span>
                    </div>
                    <router-link to="/" class="mt-3 d-block text-center text-muted font-size-small">Wrong Number?</router-link>
                </div>
            </div>
        </div>
    `
}

export default Verify;