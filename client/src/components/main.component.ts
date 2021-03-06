import {JwtHttp, AuthService} from 'ng2-ui-auth';
import {OnInit, Component} from '@angular/core';
import {ITokenUser} from '../interfaces';
import {Router} from '@angular/router';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import {ErrorHandleService} from '../services/error-handle.service';
/**
 * Created by Ron on 03/10/2016.
 */

@Component({
    selector: 'my-main',
    templateUrl: 'main.component.html',
})
export class MainComponent implements OnInit {
    user: ITokenUser;
    expiration: Date;
    secret: Observable<string>;

    constructor(private http: JwtHttp,
                private auth: AuthService,
                private router: Router,
                private eh: ErrorHandleService) {

    }

    ngOnInit() {
        this.user = this.auth.getPayload();
        this.expiration = this.auth.getExpirationDate();
        this.secret = this.http.get('/secret').map(response => response.text());
    }

    logout() {
        this.auth.logout()
            .subscribe({
                error: (err: any) => this.eh.handleError(err),
                complete: () => this.router.navigateByUrl('login')
            });
    }

    refresh() {
        this.http.refreshToken()
            .subscribe({
                error: (err: any) => this.eh.handleError(err),
                complete: () => this.expiration = this.auth.getExpirationDate()
            });
    }

    linkWithGoogle() {
        this.auth.link('google')
            .subscribe({
                error: (err: any) => this.eh.handleError(err),
                complete: () => {
                    this.expiration = this.auth.getExpirationDate();
                    this.user = this.auth.getPayload();
                }
            });
    }

    linkWithFacebook() {
        this.auth.link('facebook')
            .subscribe({
                error: (err: any) => this.eh.handleError(err),
                complete: () => {
                    this.expiration = this.auth.getExpirationDate();
                    this.user = this.auth.getPayload();
                }
            });
    }

    linkWithTwitter() {
        this.auth.link('twitter')
            .subscribe({
                error: (err: any) => this.eh.handleError(err),
                complete: () => {
                    this.expiration = this.auth.getExpirationDate();
                    this.user = this.auth.getPayload();
                }
            });
    }
}