import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DeployedReplicaRoutingModule } from './deployed-replica-routing.module';
import { BaseComponent } from './base/base.component';
import { EssentialsComponent } from './essentials/essentials.component';
import { DetailsComponent } from './details/details.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { DetailListTemplatesModule } from 'src/app/modules/detail-list-templates/detail-list-templates.module';
import { ChartsModule } from 'src/app/modules/charts/charts.module';


@NgModule({
  declarations: [BaseComponent, EssentialsComponent, DetailsComponent],
  imports: [
    CommonModule,
    DeployedReplicaRoutingModule,
    SharedModule,
    DetailListTemplatesModule,
    ChartsModule
  ]
})
export class DeployedReplicaModule { }
