import {RouterModule, Routes} from '@angular/router';

import {CreateFormComponent} from './create-form/createForm.component';
import {ShareFormComponent} from './share-form/share-form.component';
import {TakeFormComponent} from './take-form/take-form.component';
import {LoginComponent} from './login/login.component';
import {SignInComponent} from './sign-in/sign-in.component';
import {ProfileComponent} from './profile/profile.component';
import {SettingsComponent} from './settings/settings.component';
import {CreateGroupComponent} from './create-group/create-group.component';
import {SearchPageComponent} from './search-page/search-page.component';
import {HomePageComponent} from './home-page/home-page.component';

const APP_ROUTES: Routes = [
    {path: '', pathMatch: 'full', component: HomePageComponent},
    {path: 'class/:groupid', component: HomePageComponent},
    {path: 'class/:groupid/:subsection', component: HomePageComponent},
    {path: 'studentorg/:groupid', component: HomePageComponent},
    {path: 'studentorg/:groupid/:subsection', component: HomePageComponent},

    {path: 'createForm', component: CreateFormComponent},
    {path: 'shareForm', component: ShareFormComponent},
    {path: 'takeForm/:id', component: TakeFormComponent},
    {path: 'users/login', component: LoginComponent},
    {path: 'sign-in', component: SignInComponent},
    {path: 'profile/:id', component: ProfileComponent},
    {path: 'profile/:id/:subsection', component: ProfileComponent},
    {path: 'settings', component: SettingsComponent},
    {path: 'createGroup', component: CreateGroupComponent},
    {path: 'searchresults', component: SearchPageComponent}
];

export const routing = RouterModule.forRoot(APP_ROUTES);
