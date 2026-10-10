import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AddModelComponent } from './add-model.component';

describe('AddModelComponent', () => {
  let component: AddModelComponent;
  let fixture: ComponentFixture<AddModelComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AddModelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AddModelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
