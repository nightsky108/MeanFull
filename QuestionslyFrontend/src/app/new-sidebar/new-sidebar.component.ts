import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Http } from '@angular/http';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Router, NavigationStart, NavigationEnd, NavigationError, NavigationCancel, RoutesRecognized } from '@angular/router';

@Component({
    selector: 'app-new-sidebar',
    templateUrl: './new-sidebar.component.html',
    styleUrls: ['./new-sidebar.component.scss']
})
export class NewSidebarComponent implements OnInit {

    @Input() activeGroup: string;
    @ViewChild('createGroupModal') createGroupModal;

    public categories: Array<any> = [];
    public orgName = '';
    public createGroupCategory: any;

    constructor(
        private http: Http,
        private modalService: NgbModal,
        private router: Router,
    ) {

    }

    ngOnInit() {
        this.http.get('/group/mylist')
            .toPromise()
            .then(response => {
                const responseJson = response.json();

                for (const category of Object.keys(responseJson.categories)) {
                    this.categories.push(responseJson.categories[category]);
                }
            });
        this.http.get('/organizations/mine')
            .toPromise()
            .then(response => {
                const responseJson = response.json();

                this.orgName = responseJson.organization.name;
            });
    }

    // category is an object from the backend
    openCreateGroupModal(category: any) {
        this.createGroupCategory = category;
        const ref = this.modalService.open(this.createGroupModal);
        this.router.events
            .filter(event => event instanceof NavigationStart)
            .subscribe((event: NavigationStart) => {
                ref.close();
            });
    }

}
