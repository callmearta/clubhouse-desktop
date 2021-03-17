const ClubHouseApi = require('clubhouse-api');
const store = require('store');

const EditProfile = {
    mounted:function(){

    },
    data:function(){
        return{
            userData: store.get('userData'),
            firstName:'',
            lastName: '',
            username:'',
        }
    },
    methods:{
        updateName: async function(){
            if(this.firstName.length && this.lastName.length && this.username.length && this.username.length <= 16){
                const profile = {
                    ...ClubHouseApi.profiles.application.a304,
                    ...ClubHouseApi.profiles.locales.English,
                    userId: this.userData.user_profile.user_id,
                    token: this.userData.auth_token
                };
                const result = await ClubHouseApi.api.updateName(profile, `${this.firstName} ${this.lastName}`);
                console.log(result);
                if(result.success){
                    this.updateUsername();
                }else{
                    console.error(result);
                    new Notification('Error',{
                        body: result.error_message
                    });
                }
            }else{
                if(!this.username.length || this.username.length > 16){
                    return new Notification('Error',{
                        body: 'Username is required and also must be less than 16 characters'
                    });;
                }
                new Notification('Error',{
                    body: 'Both first name and last name are required'
                }); 
            }
        },
        updateUsername: async function(){
            if(this.username.length && this.username.length <= 16){
                const profile = {
                    ...ClubHouseApi.profiles.application.a304,
                    ...ClubHouseApi.profiles.locales.English,
                    userId: this.userData.user_profile.user_id,
                    token: this.userData.auth_token
                };
                const result = await ClubHouseApi.api.updateUsername(profile, this.username);
                console.log(result);
                if(result.success){
                    this.$router.replace({name:'home'});
                }else{
                    console.error(result);
                    new Notification('Error',{
                        body: result.error_message
                    });
                }
            }else{
                new Notification('Error',{
                    body: 'Username is required and also must be less than 16 characters'
                });
            }
        },
        submit: function(){
            this.updateName();
        }
    },
    template: `
        <div>
            <div class="edit-profile-page justify-content-start">
                <div class="card p-4 my-5 max-width-500 mt-5 mx-auto">
                    <strong class="d-block font-weight-bold border-bottom pb-2 mb-4">Complete your profile</strong>
                    <p>Welcome to Clubhouse, Complete your profile in order to continue.</p>
                    <div class="input-group">
                        <label>First Name:</label>
                        <input type="text" class="form-control" v-model="firstName" placeholder="Enter your first name" />
                    </div>
                    <div class="input-group mt-2">
                        <label>Last Name:</label>
                        <input type="text" class="form-control" v-model="lastName" placeholder="Enter your last name" />
                    </div>
                    <div class="input-group mt-2">
                        <label>Username:</label>
                        <input type="text" class="form-control" v-model="username" placeholder="Enter your username" />
                    </div>
                    <button class="btn-success d-block mt-5 w-100" @click="submit">
                        <i class="far fa-check"></i>
                        <strong>Submit</strong>
                    </button>
                </div>
            </div>
        </div>
    `
}

export default EditProfile;