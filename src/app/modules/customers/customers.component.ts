import {HttpClient} from '@angular/common/http';
import {Component, ViewChild, AfterViewInit} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort, SortDirection} from '@angular/material/sort';
import {merge, Observable, of as observableOf} from 'rxjs';
import {catchError, map, startWith, switchMap} from 'rxjs/operators';
import {CUSTOMERS_APIS} from '../../lookups/apis.lookups';
import {COUNTRIES, Customer, CUSTOMER_TABLE_COLS} from '../../lookups/app.lookups';
import {FormBuilder, FormGroup} from "@angular/forms";

@Component({
  selector: 'app-customers',
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.css']
})
export class CustomersComponent implements AfterViewInit {
  displayedColumns: string[] = CUSTOMER_TABLE_COLS;
  countries: string[] = COUNTRIES;
  exampleDatabase: CustomersHttpDatabase | null;
  data: Customer[] = [];
  resultsLength = 0;
  isLoadingResults = true;
  isRateLimitReached = false;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  formGroup: FormGroup;
  pageSize = 10;
  filterActivated = false;

  constructor(private httpClient: HttpClient, private fb: FormBuilder) {
    this.formGroup = this.fb.group({
      country: ['', []],
      state: ['', []],
    });
  }
  ngAfterViewInit(): void {
    this.getCustomers(`${CUSTOMERS_APIS.url}?page=${this.paginator.pageIndex}&size=${this.pageSize}`);
  }

  getCustomers(requestUrl): void{
    this.exampleDatabase = new CustomersHttpDatabase(this.httpClient);
    this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));
    merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        startWith({}),
        switchMap(() => {
          this.isLoadingResults = true;
          return this.exampleDatabase!.getRepoIssues(requestUrl).pipe(catchError(() => observableOf(null)));
        }),
        map(data => {
          this.isLoadingResults = false;
          this.isRateLimitReached = data === null;
          if (data === null) {
            return [];
          }
          this.resultsLength = data.totalElements || data.length;
          return data.content || data;
        }),
      )
      .subscribe(data => (this.data = data));
  }
  applyFilter(): void {
    this.filterActivated = true;
    this.getCustomers(`${CUSTOMERS_APIS.filter}?state=${this.formGroup.value.state || ''}&country=${this.formGroup.value.country || ''}`);
  }
  clearFilter(): void {
    this.formGroup.reset();
    if (  this.filterActivated ) {
      this.getCustomers(`${CUSTOMERS_APIS.url}?page=${this.paginator.pageIndex}&size=${this.pageSize}`);
      this.filterActivated = false;
    }
  }
}

export class CustomersHttpDatabase {
  constructor(private httpClient: HttpClient) {}
  getRepoIssues(requestUrl: string): Observable<any> {
    return this.httpClient.get<Customer>(requestUrl);
  }
}
