@admin
Feature: Admin dashboard and access control
  In order to manage the platform
  As an administrator
  I want to access the admin dashboard and see admin-only controls

  Background:
    Given the application is available

  Scenario: Admin can access the dashboard
    Given I am logged in as an admin
    When I visit "/admin/dashboard"
    Then I should see admin dashboard widgets

  Scenario: Non-admin is denied access
    Given I am logged in as a non-admin user
    When I visit "/admin/dashboard"
    Then I should see an access denied or be redirected away


