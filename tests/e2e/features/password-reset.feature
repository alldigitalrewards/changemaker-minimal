@auth @password
Feature: Password reset
  As a user who forgot my password
  I want to request a reset and set a new password

  Background:
    Given the application is available

  Scenario: Request password reset with valid email
    When I visit "/auth/reset-password"
    And I fill in "email" with an existing account email
    And I submit the form
    Then I should see a message to check my email

  Scenario: Request password reset with unknown email
    When I visit "/auth/reset-password"
    And I fill in "email" with "unknown@user.test"
    And I submit the form
    Then I should see a generic success message without revealing account existence

  Scenario: Complete password reset via magic link
    Given I have a valid password reset link
    When I open the link
    And I fill in "newPassword" with a strong password
    And I submit the form
    Then I should be able to log in with the new password


