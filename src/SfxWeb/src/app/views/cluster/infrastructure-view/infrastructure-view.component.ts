import { Component, Injector, OnInit } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { IResponseMessageHandler } from 'src/app/Common/ResponseMessageHandlers';
import { InfrastructureCollection } from 'src/app/Models/DataModels/collections/infrastructureCollection';
import { RepairTaskCollection } from 'src/app/Models/DataModels/collections/RepairTaskCollection';
import { InfrastructureJob } from 'src/app/Models/DataModels/infrastructureJob';
import { DataService } from 'src/app/services/data.service';
import { SettingsService } from 'src/app/services/settings.service';
import { BaseControllerDirective } from 'src/app/ViewModels/BaseController';
import { NodeLevelUpdatesService } from 'src/app/services/node-level-updates.service';

@Component({
  selector: 'app-infrastructure-view',
  templateUrl: './infrastructure-view.component.html',
  styleUrls: ['./infrastructure-view.component.scss']
})
export class InfrastructureViewComponent extends BaseControllerDirective {
  public collection: InfrastructureCollection;
  public repairTaskCollection: RepairTaskCollection;

  allPendingMRJobs: InfrastructureJob[] = [];
  executingMRJobs: InfrastructureJob[] = [];

  constructor(private data: DataService, injector: Injector, private settings: SettingsService, private nlu: NodeLevelUpdatesService) {
    super(injector);
  }

  setup() {
    this.collection = this.data.infrastructureCollection;
    this.repairTaskCollection = this.data.repairCollection;

    this.nlu.getNodeStatus().subscribe(v => console.log(v));
  }

  refresh(messageHandler?: IResponseMessageHandler): Observable<any> {
    return forkJoin([
      this.collection.refresh(messageHandler),
      this.repairTaskCollection.refresh(messageHandler)
    ])
  }
}
