import { Component, Input } from '@angular/core';
import { Http } from "@angular/http";

@Component({
    selector: 'app-resource-list',
    templateUrl: './resource-list.component.html',
    styleUrls: ['./resource-list.component.scss']
})
export class ResourceListComponent {
    @Input() resource: string;
    @Input() list: any[] = [];

    constructor(
        private http: Http
    ) {}

    pic(item) {
        if (item.fb) {
            return `https://graph.facebook.com/${item.fb}/picture?width=80&height=80`;
        } else {
            if (item.pic) {
                return item.pic;
            } else {
                switch (this.resource) {
                    case "user":
                        return `/images/${item.gender}.png`;
                    case "community":
                        return "/images/question.jpg";
                    case "form":
                        return "/images/question.jpg";
                }
            }
        }
    }

    link(item) {
        switch (this.resource) {
            case "user":
                return `/profile/${item.id}`;
            case "community":
                return `/group/${item.id}`;
            case "form":
                return ['/feed', {'survey': item.id}];

        }
    }
}