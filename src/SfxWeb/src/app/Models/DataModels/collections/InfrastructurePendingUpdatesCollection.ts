import { Observable, from } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { Constants, StatusWarningLevel } from 'src/app/Common/Constants';
import { IResponseMessageHandler } from 'src/app/Common/ResponseMessageHandlers';
import { DataService } from 'src/app/services/data.service';
import { DataModelBase } from '../Base';
import { DataModelCollectionBase } from './CollectionBase';

import { IRawInfrastructurePendingUpdate } from '../../RawDataTypes';

export class InfrastructurePendingUpdateItem extends DataModelBase<IRawInfrastructurePendingUpdate> {
  constructor(public data: DataService, public raw: IRawInfrastructurePendingUpdate) {
    super(data, raw);
  }
}

export class InfrastructurePendingUpdateCollection extends DataModelCollectionBase<InfrastructurePendingUpdateItem> {
  public constructor(data: DataService) {
    super(data, parent);
  }

  protected retrieveNewCollection(messageHandler?: IResponseMessageHandler): Observable<InfrastructurePendingUpdateItem[]> {
    return this.data.getSystemServices(true, messageHandler).pipe(mergeMap(services => {
      const infrastructureServices = services.collection
        .filter(service => service.raw.TypeName === Constants.InfrastructureServiceType);

      return from(infrastructureServices).pipe(
        mergeMap(service => this.data.restClient.getInfrastructurePendingUpdates(service.id).pipe(
          map(response => response.map(r => new InfrastructurePendingUpdateItem(this.data, r) ) )
        )));
    }));
  }
}
