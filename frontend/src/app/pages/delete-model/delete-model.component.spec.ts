import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DeleteModelComponent } from './delete-model.component';

describe('DeleteModelComponent', () => {
  let component: DeleteModelComponent;
  let fixture: ComponentFixture<DeleteModelComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [DeleteModelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteModelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
