const ClubHouseApi = require('clubhouse-api');
const store = require('store');

const profiles = {
    ...ClubHouseApi.profiles.application.a304,
    ...ClubHouseApi.profiles.locales.English
};

const Login = {
    beforeRouteEnter (to, from, next) {
        const userData = store.get('userData');
        if(userData){
            if(!userData.is_verified){
                next('/waitlist');
            }
            next('/home');
        }else{
            next();
        }
    },
    data:function(){
        return{
            phone:'',
            loading:false
        }
    },
    methods:{
        smsAuth: async function(){
            if(this.phone.length <= 16 && this.phone.length >= 4){
                this.loading = true;
                const result = await ClubHouseApi.api.requestMobileAuth(profiles,this.phone);
                console.log(result);

                if(result.success){
                    this.$router.push({
                        name:'verify',
                        params:{
                            phone: this.phone
                       }
                    });
                }else{
                    console.error(result);
                    this.loading = false;
                    const notif = new Notification('Failed', {
                        body: result.error_message
                    });
                }
            }else{
                new Notification('Not Valid',{
                    body: 'Phone number should be 13 characters'
                });
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
                        <input type="tel" class="form-control" v-model="phone" placeholder="+442123532" />
                    </div>
                    <div class="d-flex align-items-center justify-content-center mt-4">
                        <button class="btn-primary" @click="smsAuth">Next</button>
                    </div>
                </div>
            </div>
        </div>
    `
};

export default Login;