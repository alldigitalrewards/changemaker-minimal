@rbac
Feature: Role-based access control
  Users should see UI and routes appropriate to their roles

  Background:
    Given I am logged in

  Scenario: Admin sees admin sidebar and tools
    Given I have the admin role
    When I visit "/w/example"
    Then I should see admin controls in the sidebar

  Scenario: Participant does not see admin tools
    Given I am a non-admin member
    When I visit "/w/example"
    Then I should not see admin controls in the sidebar

  Scenario: Admin can access admin routes
    Given I have the admin role
    When I visit "/admin/dashboard"
    Then I should see admin dashboard widgets

  Scenario: Participant is blocked from admin routes
    Given I am a non-admin member
    When I visit "/admin/dashboard"
    Then I should see an access denied or be redirected away


